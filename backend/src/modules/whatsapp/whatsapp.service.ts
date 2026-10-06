import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../../database/prisma.service';
import { AiParserService } from '../ai-parser/ai-parser.service';
import { AIIntent, RecordScope, ExpenseCategory } from '../../../../packages/shared/src';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private prisma: PrismaService,
    private aiParser: AiParserService,
    private configService: ConfigService,
  ) { }

  async processEvent(payload: any) {
    try {
      const entry = payload.entry?.[0];
      const changes = entry?.changes?.[0]?.value;
      const message = changes?.messages?.[0];

      if (!message || message.type !== 'text') {
        return;
      }

      const messageId = message.id;
      const fromNumber = '+' + message.from; // formato E.164 (ex: +5511999999999)
      const textBody = message.text.body;

      this.logger.log(`WhatsApp message received from ${fromNumber}: "${textBody}"`);

      // 1. Idempotência: Checar se o evento já foi processado
      const alreadyProcessed = await this.prisma.processedWebhookEvent.findUnique({
        where: { id: messageId },
      });
      if (alreadyProcessed) {
        this.logger.warn(`Message ID ${messageId} already processed. Skipping.`);
        return;
      }

      await this.prisma.processedWebhookEvent.create({
        data: { id: messageId },
      });

      // 2. Identificar Usuário pelo Telefone (robusto a máscaras, espaços e 9º dígito)
      const user = await this.findUserByPhone(message.from);

      if (!user) {
        await this.sendWhatsAppMessage(
          message.from,
          `Olá! 👋 Seu número (${fromNumber}) ainda não está vinculado a uma conta Nexo.\n\nAcesse o app e cadastre seu telefone em Perfil para começar a registrar gastos e lembretes por aqui!`,
        );
        return;
      }

      // 3. Processar mensagem com o AI Parser
      const parsed = await this.aiParser.parseMessage(textBody);

      // 4. Executar a ação de domínio com base na intenção
      if (parsed.intent === AIIntent.CREATE_EXPENSE && parsed.data.amount) {
        const isShared = parsed.data.scope === RecordScope.SHARED && !!user.householdId;

        const expense = await this.prisma.expense.create({
          data: {
            description: parsed.data.title,
            amount: parsed.data.amount,
            category: parsed.data.category || ExpenseCategory.OTHER,
            scope: isShared ? RecordScope.SHARED : RecordScope.PRIVATE,
            rawSource: 'whatsapp_message',
            userId: user.id,
            householdId: isShared ? user.householdId : null,
          },
        });

        const scopeLabel = isShared ? '🏠 Compartilhado' : '🔒 Privado (Pessoal)';
        const formattedAmount = Number(expense.amount).toFixed(2).replace('.', ',');

        await this.sendWhatsAppMessage(
          message.from,
          `✅ *Gasto Registrado!*\n\n📝 *${expense.description}*\n💰 *R$ ${formattedAmount}*\n🏷️ *Escopo:* ${scopeLabel}\n\nJá sincronizado no seu app Nexo! 📲`,
        );
      } else if (parsed.intent === AIIntent.CREATE_TASK) {
        const isShared = parsed.data.scope === RecordScope.SHARED && !!user.householdId;

        const task = await this.prisma.task.create({
          data: {
            title: parsed.data.title,
            scope: isShared ? RecordScope.SHARED : RecordScope.PRIVATE,
            userId: user.id,
            householdId: isShared ? user.householdId : null,
          },
        });

        const scopeLabel = isShared ? '🏠 Lembrete Compartilhado' : '🔒 Lembrete Pessoal';
        await this.sendWhatsAppMessage(
          message.from,
          `📌 *Lembrete Anotado!*\n\n"${task.title}"\n${scopeLabel}\n\nVocê pode ver sua lista de rotina no app!`,
        );
      } else if (parsed.intent === AIIntent.CREATE_GOAL && parsed.data.amount) {
        const isShared = parsed.data.scope === RecordScope.SHARED && !!user.householdId;

        const goal = await this.prisma.goal.create({
          data: {
            title: parsed.data.title,
            targetAmount: parsed.data.amount,
            scope: isShared ? RecordScope.SHARED : RecordScope.PRIVATE,
            userId: user.id,
            householdId: isShared ? user.householdId : null,
          },
        });

        await this.sendWhatsAppMessage(
          message.from,
          `🎯 *Nova Meta Criada!*\n\n"${goal.title}" com alvo de R$ ${Number(goal.targetAmount).toFixed(2)}`,
        );
      } else {
        await this.sendWhatsAppMessage(
          message.from,
          `🤔 Não consegui entender completamente o registro.\n\nExperimente enviar:\n• "Gastei 45 no mercado compartilhado"\n• "Almoço 32 privado"\n• "Lembrar de pagar luz dia 10"`,
        );
      }
    } catch (error) {
      this.logger.error('Error handling WhatsApp message', error);
    }
  }

    private async findUserByPhone(rawPhone: string) {
    const digits = (rawPhone || '').replace(/\D/g, '');
    const withoutCountry = digits.startsWith('55') ? digits.slice(2) : digits;

    const users = await this.prisma.user.findMany({
      where: { phoneNumber: { not: null } },
      include: { household: true },
    });

    return (
      users.find((u) => {
        if (!u.phoneNumber) return false;
        const uDigits = u.phoneNumber.replace(/\D/g, '');
        const uWithoutCountry = uDigits.startsWith('55') ? uDigits.slice(2) : uDigits;

        if (digits === uDigits || withoutCountry === uWithoutCountry) return true;

        // Variação do nono dígito no Brasil (11 vs 10 dígitos)
        if (withoutCountry.length === 11 && uWithoutCountry.length === 10) {
          return (
            withoutCountry.slice(0, 2) === uWithoutCountry.slice(0, 2) &&
            withoutCountry.slice(3) === uWithoutCountry.slice(2)
          );
        }
        if (withoutCountry.length === 10 && uWithoutCountry.length === 11) {
          return (
            withoutCountry.slice(0, 2) === uWithoutCountry.slice(0, 2) &&
            withoutCountry.slice(2) === uWithoutCountry.slice(3)
          );
        }

        return false;
      }) || null
    );
  }

  async sendWhatsAppMessage(toPhone: string, text: string) {
    const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');

    if (!accessToken || !phoneNumberId || accessToken === 'your_meta_permanent_access_token_here') {
      this.logger.warn(
        `[MOCK WHATSAPP OUTBOUND] Para: ${toPhone} | Mensagem: "${text.replace(/\n/g, ' ')}"`,
      );
      return;
    }

    try {
      await axios.post(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: toPhone,
          type: 'text',
          text: { body: text },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (err: any) {
      this.logger.error(`Failed to send WhatsApp message via Meta API: ${err?.response?.data || err.message}`);
    }
  }
}
