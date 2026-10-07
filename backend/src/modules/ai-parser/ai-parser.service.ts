import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import {
  AIIntent,
  ExpenseCategory,
  RecordScope,
  ParsedWhatsAppResultDto,
} from '../../../../packages/shared/src';

@Injectable()
export class AiParserService {
  private readonly logger = new Logger(AiParserService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  private getParserSchema() {
    return {
      type: SchemaType.OBJECT,
      properties: {
        intent: {
          type: SchemaType.STRING,
          enum: [
            AIIntent.CREATE_EXPENSE,
            AIIntent.CREATE_TASK,
            AIIntent.CREATE_GOAL,
            AIIntent.CREATE_EVENT,
            AIIntent.CREATE_SHOPPING_ITEM,
            AIIntent.UNKNOWN,
          ],
        },
        confidence: { type: SchemaType.NUMBER },
        data: {
          type: SchemaType.OBJECT,
          properties: {
            title: { type: SchemaType.STRING },
            amount: { type: SchemaType.NUMBER },
            category: {
              type: SchemaType.STRING,
              enum: [
                ExpenseCategory.FOOD_MARKET,
                ExpenseCategory.RESTAURANT,
                ExpenseCategory.TRANSPORTATION,
                ExpenseCategory.HEALTH,
                ExpenseCategory.LEISURE,
                ExpenseCategory.UTILITIES,
                ExpenseCategory.SUBSCRIPTIONS,
                ExpenseCategory.OTHER,
              ],
            },
            scope: {
              type: SchemaType.STRING,
              enum: [RecordScope.PRIVATE, RecordScope.SHARED],
            },
            dueDate: { type: SchemaType.STRING },
            hasSpecificTime: { type: SchemaType.BOOLEAN },
            startDate: { type: SchemaType.STRING },
            endDate: { type: SchemaType.STRING },
            isAllDay: { type: SchemaType.BOOLEAN },
            location: { type: SchemaType.STRING },
            notes: { type: SchemaType.STRING },
          },
          required: ['title', 'scope'],
        },
      },
      required: ['intent', 'confidence', 'data'],
    };
  }

  async parseMessage(messageText: string, now: Date = new Date()): Promise<ParsedWhatsAppResultDto> {
    const referenceIso = now.toISOString();

    // 1. Tentar via Gemini API com Structured Outputs
    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: 'gemini-3.5-flash-lite',
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: this.getParserSchema(),
          },
        });

        const prompt = `Você é o interpretador oficial inteligente do assistente Nexo (gestão financeira e rotina pessoal/casal).
Data e hora atual de referência: ${referenceIso} (fuso horário de Brasília UTC-3).

Analise a mensagem em português e extraia as informações estruturadas seguindo com rigor estas regras:

REGRA DE OURO SOBRE ESCOPO (PRIVADO vs COMPARTILHADO):
- O escopo OBRIGATÓRIO por padrão é "PRIVATE".
- SOMENTE classifique como "SHARED" se a mensagem contiver explicitamente palavras como "compartilhado", "compartilhada", "compartilhar", "para nós", "pra nós", "juntos", "do casal", "nossa", "nosso", "da casa".
- Se nada for dito sobre ser compartilhado, NUNCA presuma que é compartilhado: marque SEMPRE "PRIVATE".

1. METAS (CREATE_GOAL):
- SE a mensagem contiver "meta", "na meta", "nova meta", "objetivo", "guardar", "poupar", "juntar dinheiro" (ex: "Adicionar viagem para Itália na meta com gasto de 10.000", "Meta reforma 5000", "Guardar 2000 na meta carro"):
  Classifique OBRIGATORIAMENTE como CREATE_GOAL, mesmo que use palavras como "gasto", "comprar" ou "pagar".
- 'amount': extraia o valor alvo numérico (ex: 10000).
- 'title': limpe o título deixando apenas o nome da meta (ex: "Viagem para Itália").
- 'scope': PRIVATE por padrão. Somente SHARED se disser expressamente compartilhado/nossa meta/juntos.

2. LEMBRETES E TAREFAS (CREATE_TASK):
- Se indicar um lembrete, compromisso ou prazo (ex: "Pagar conta de luz daqui 10 minutos", "Lembrar do médico dia 30/10 às 15h", "Lembrar de comprar pão"):
  Classifique como CREATE_TASK.
- 'title': o texto do lembrete limpo sem "lembrar de", "me lembre" (ex: "Pagar conta de luz", "Médico").
- 'dueDate': calcule a data e hora ISO exata calculada a partir da data de referência (${referenceIso}).
  Ex: "daqui 10 minutos" -> adicione 10 minutos à data de referência.
  Ex: "dia 30/10" -> ano corrente, 30 de outubro às 08:00 (UTC-3).
  Ex: "dia 30/10 às 15h" -> ano corrente, 30 de outubro às 15:00 (UTC-3).
- 'hasSpecificTime': true se o usuário informou um horário ou minutos/horas específicas (ex: "daqui 10 minutos", "às 15h"). false se informou apenas o dia (ex: "dia 30/10").
- 'scope': PRIVATE por padrão.


4. COMPROMISSOS, REUNIÕES E EVENTOS DE AGENDA (CREATE_EVENT):
- Se indicar um compromisso de calendário, evento, reunião, consulta médica, voo, aniversário ou festa (ex: "Agendar reunião amanhã às 15h", "Dentista quinta 14:00", "Adicionar evento Aniversário do João dia 20/11", "Compromisso médico sexta"):
  Classifique como CREATE_EVENT.
- "title": título do compromisso limpo (ex: "Reunião de Alinhamento", "Dentista", "Aniversário do João").
- "startDate": data e hora ISO calculada com precisão (fuso UTC-3 de Brasília).
- "endDate": data e hora de término ISO (se não informado, assuma 1 hora após startDate).
- "isAllDay": true se for dia inteiro sem hora específica, false se tiver hora.
- "location": local se mencionado (ex: "Consultório Dr. Paulo", "Google Meet").
- "scope": PRIVATE por padrão. Somente SHARED se disser expressamente compartilhado, nossa agenda, do casal ou juntos.

3. GASTOS E DESPESAS (CREATE_EXPENSE):
- Gastos imediatos já realizados (ex: "Gastei 45 no mercado compartilhado", "Almoço 32", "Farmácia 25").
- 'scope': PRIVATE por padrão. Somente SHARED se disser explicitamente compartilhado, da casa ou juntos.
- NUNCA classifique como CREATE_EXPENSE se houver a palavra "meta", "poupar" ou "guardar".

Mensagem: "${messageText}"`;

        const result = await model.generateContent(prompt);
        const parsed = JSON.parse(result.response.text()) as ParsedWhatsAppResultDto;
        this.logger.log(`Parsed message via LLM: ${JSON.stringify(parsed)}`);
        return parsed;
      } catch (err) {
        this.logger.warn(`LLM parsing failed or timed out. Falling back to heuristic parser: ${err}`);
      }
    }

    // 2. Fallback Heurístico Robusto
    return this.heuristicFallback(messageText, now);
  }

  async parseMedia(
    mediaBuffer: Buffer,
    mimeType: string,
    caption?: string,
    now: Date = new Date(),
  ): Promise<ParsedWhatsAppResultDto> {
    const referenceIso = now.toISOString();
    const cleanMimeType = (mimeType || 'image/jpeg').split(';')[0].trim();

    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: 'gemini-3.5-flash-lite',
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: this.getParserSchema(),
          },
        });

        const prompt = `Você é o assistente inteligente multimodal do Nexo (gestão financeira e rotina pessoal/casal).
Data e hora atual de referência: ${referenceIso} (fuso horário de Brasília UTC-3).
${caption ? `Legenda da mensagem enviada pelo usuário: "${caption}"` : ''}

Analise com precisão a mídia fornecida (pode ser uma foto de comprovante/recibo/cupom fiscal/nota fiscal/produto/meta ou áudio de voz em português) e extraia os dados estruturados:

REGRA DE OURO SOBRE ESCOPO:
- O escopo DEFAULT OBRIGATÓRIO é "PRIVATE".
- SOMENTE defina "SHARED" se a legenda ou o áudio contiver expressamente palavras como "compartilhado", "compartilhada", "compartilhar", "para nós", "pra nós", "juntos", "do casal", "nossa", "da casa".
- Caso contrário, defina SEMPRE "PRIVATE".

DIRETRIZES DE RECONHECIMENTO:
1. COMPROVANTES, RECIBOS E CUPONS FISCAIS OU ÁUDIO DE GASTO (CREATE_EXPENSE):
   - Se for foto de comprovante Pix, recibo de máquina de cartão, cupom fiscal, fatura ou nota fiscal:
     - 'intent': "CREATE_EXPENSE"
     - 'amount': extraia o VALOR TOTAL pago como número decimal (ex: 78.90).
     - 'title': nome do estabelecimento ou descrição do gasto (ex: "Supermercado Extra", "Posto Ipiranga", "Almoço Restaurante", "Farmácia Droga Raia").
     - 'category': deduza a categoria mais adequada entre FOOD_MARKET, RESTAURANT, TRANSPORTATION, HEALTH, UTILITIES, LEISURE, SUBSCRIPTIONS, OTHER.
   - Se for áudio onde a pessoa fala sobre uma compra/gasto realizado (ex: "Gastei 60 reais no açougue hoje"):
     - 'intent': "CREATE_EXPENSE"
     - 'amount': o valor mencionado.
     - 'title': o que foi comprado/gasto.
     - 'category': a categoria correspondente.

2. METAS FINANCEIRAS E OBJETIVOS (CREATE_GOAL):
   - Se a mídia for um áudio ou foto com legenda referente a poupar, guardar dinheiro, comprar um bem futuro ou objetivo financeiro (ex: áudio dizendo "Quero criar uma meta de 15 mil reais para reforma da casa" ou foto de viagem com legenda "Meta de 10.000 para Paris"):
     - 'intent': "CREATE_GOAL"
     - 'amount': o valor monetário alvo da meta.
     - 'title': o nome limpo do objetivo (ex: "Reforma da casa", "Viagem para Paris").

3. LEMBRETES E TAREFAS (CREATE_TASK):
   - Se for áudio pedindo para lembrar de algo (ex: "lembrar de pagar condomínio dia 10", "consulta médica amanhã às 14h"):
     - 'intent': "CREATE_TASK"
     - 'title': descrição do compromisso/tarefa.
     - 'dueDate': data e hora calculada a partir de ${referenceIso}.
     - 'hasSpecificTime': true se informou hora/minuto, false se apenas o dia.`;

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: mediaBuffer.toString('base64'),
              mimeType: cleanMimeType,
            },
          },
        ]);

        const parsed = JSON.parse(result.response.text()) as ParsedWhatsAppResultDto;
        this.logger.log(`Parsed multimodal media via LLM: ${JSON.stringify(parsed)}`);
        return parsed;
      } catch (err) {
        this.logger.warn(`Multimodal LLM parsing failed: ${err}`);
      }
    }

    if (caption) {
      return this.heuristicFallback(caption, now);
    }

    return {
      intent: AIIntent.UNKNOWN,
      confidence: 0.2,
      data: {
        title: 'Mídia não identificada',
        scope: RecordScope.PRIVATE,
      },
    };
  }

  private heuristicFallback(text: string, now: Date): ParsedWhatsAppResultDto {
    const lower = text.toLowerCase();

    // Detecção de valores monetários (ex: 10.000, 10000, 45, 45.90, R$ 45,00, 150 reais)
    const sanitizedAmountText = text.replace(/(\d+)\.(\d{3})/g, '$1$2'); // 10.000 -> 10000
    const amountMatch = sanitizedAmountText.match(/(?:r\$|reais)?\s*(\d+(?:[.,]\d{1,2})?)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : undefined;

    // Detecção de escopo estritamente por palavras explícitas
    const isShared =
      lower.includes('compartilhad') ||
      lower.includes('compartilhar') ||
      lower.includes('juntos') ||
      lower.includes('casal') ||
      lower.includes('para nós') ||
      lower.includes('pra nós') ||
      lower.includes('nossa') ||
      lower.includes('nosso');

    const scope = isShared ? RecordScope.SHARED : RecordScope.PRIVATE;

    // 0. PRIORIDADE: Detecção de Lista de Compras
    if (
      lower.includes('lista de compras') ||
      lower.includes('lista de mercado') ||
      lower.includes('adicionar na lista') ||
      lower.includes('colocar na lista') ||
      (lower.startsWith('comprar ') && amount === undefined)
    ) {
      const clean = text
        .replace(/(?:adicionar|colocar|por|bota|botar)?\s*(?:na|pra|para)?\s*lista\s*(?:de\s*(?:compras|mercado))?/gi, '')
        .replace(/^comprar\s*/gi, '')
        .trim();

      const rawItems = clean.split(/[\n,;•-]+/).map((s) => s.trim()).filter(Boolean);
      const items = (rawItems.length > 0 ? rawItems : [clean]).map((it) => ({
        name: it.charAt(0).toUpperCase() + it.slice(1),
        quantity: '1',
      }));

      return {
        intent: AIIntent.CREATE_SHOPPING_ITEM,
        confidence: 0.9,
        data: {
          title: 'Lista de Compras',
          scope,
          items,
        },
      };
    }

    // 1. PRIORIDADE MÁXIMA: Detecção de Meta
    if (
      lower.includes('meta') ||
      lower.includes('guardar') ||
      lower.includes('poupar') ||
      lower.includes('objetivo')
    ) {
      let cleanTitle = text
        .replace(/^(?:adicionar|criar|nova)\s+/i, '')
        .replace(/\s*(?:na|pra|para|em)\s+meta(?:\s+com|\s+de)?.*$/i, '')
        .replace(/^meta\s*(?:de|para)?\s*/i, '')
        .replace(/(?:gasto\s+de|valor\s+de|r\$|\d+(?:[.,]\d+)?|reais|compartilhad[ao]|privad[ao])/gi, '')
        .trim();
      if (!cleanTitle) cleanTitle = 'Nova Meta';

      return {
        intent: AIIntent.CREATE_GOAL,
        confidence: 0.9,
        data: {
          title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
          amount: amount || 1000,
          scope,
        },
      };
    }


    // 1.5. Detecção de Compromisso / Evento de Calendário
    if (
      lower.includes("agendar") ||
      lower.includes("agenda") ||
      lower.includes("evento") ||
      lower.includes("reunião") ||
      lower.includes("reuniao") ||
      lower.includes("consulta") ||
      lower.includes("aniversário") ||
      lower.includes("aniversario")
    ) {
      let eventDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // amanhã padrão
      let isAllDay = true;

      // amanhã
      if (lower.includes("hoje")) {
        eventDate = new Date(now);
      } else if (lower.includes("amanha") || lower.includes("amanhã")) {
        eventDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      }

      // Horário (ex: "às 15h" ou "15:30")
      const timeMatch = lower.match(/(?:às|as)s+(d{1,2})(?:h|:(d{2}))?/i);
      if (timeMatch) {
        const h = parseInt(timeMatch[1], 10);
        const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        eventDate.setHours(h, m, 0, 0);
        isAllDay = false;
      }

      const endDate = new Date(eventDate.getTime() + (isAllDay ? 24 * 3600 * 1000 : 60 * 60 * 1000));

      let cleanTitle = text
        .replace(/^(?:agendar|adicionar|marcar|criar)?s*(?:evento|reunião|reuniao|compromisso|consulta)?s*(?:de)?/i, "")
        .replace(/(?:às|as)s+d{1,2}(?:h|:d{2})?/gi, "")
        .replace(/(?:amanhã|amanha|hoje)/gi, "")
        .trim();
      if (!cleanTitle) cleanTitle = text;

      return {
        intent: AIIntent.CREATE_EVENT,
        confidence: 0.88,
        data: {
          title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
          startDate: eventDate.toISOString(),
          endDate: endDate.toISOString(),
          isAllDay,
          scope,
        },
      };
    }

    // 2. Detecção de Lembrete / Tarefa
    if (
      lower.startsWith('lembr') ||
      lower.includes('lembrar') ||
      lower.includes('pagar conta') ||
      lower.includes('compromisso') ||
      lower.includes('nao esquecer') ||
      lower.includes('daqui')
    ) {
      let dueDate: Date | undefined;
      let hasSpecificTime = false;

      // "daqui X minutos"
      const minMatch = lower.match(/daqui\s+(\d+)\s+min/i);
      if (minMatch) {
        const mins = parseInt(minMatch[1], 10);
        dueDate = new Date(now.getTime() + mins * 60 * 1000);
        hasSpecificTime = true;
      }

      // "daqui X horas"
      const hourMatch = lower.match(/daqui\s+(\d+)\s+h/i);
      if (hourMatch) {
        const hrs = parseInt(hourMatch[1], 10);
        dueDate = new Date(now.getTime() + hrs * 60 * 60 * 1000);
        hasSpecificTime = true;
      }

      // "dia DD/MM" ou "dia DD"
      const dateMatch = lower.match(/dia\s+(\d{1,2})(?:\/(\d{1,2}))?/i);
      if (dateMatch && !dueDate) {
        const day = parseInt(dateMatch[1], 10);
        const month = dateMatch[2] ? parseInt(dateMatch[2], 10) - 1 : now.getMonth();
        const year = now.getFullYear();

        // Verificar se tem horário (ex: "às 15h" ou "15:00")
        const timeMatch = lower.match(/(?:às|as)\s+(\d{1,2})(?:h|:(\d{2}))?/i);
        if (timeMatch) {
          const h = parseInt(timeMatch[1], 10);
          const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          dueDate = new Date(year, month, day, h, m, 0);
          hasSpecificTime = true;
        } else {
          dueDate = new Date(year, month, day, 8, 0, 0);
          hasSpecificTime = false;
        }
      }

      let cleanTitle = text
        .replace(/^(?:me\s+)?lembr(?:ar|e|a)?\s*(?:de)?/i, '')
        .replace(/(?:daqui\s+\d+\s+min(?:utos)?|daqui\s+\d+\s+horas?)/gi, '')
        .trim();
      if (!cleanTitle) cleanTitle = text;

      return {
        intent: AIIntent.CREATE_TASK,
        confidence: 0.85,
        data: {
          title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
          dueDate: dueDate ? dueDate.toISOString() : undefined,
          hasSpecificTime,
          scope,
        },
      };
    }

    // 3. Detecção de Gasto
    if (amount !== undefined) {
      let category = ExpenseCategory.OTHER;
      if (lower.includes('mercado') || lower.includes('compras') || lower.includes('feira')) {
        category = ExpenseCategory.FOOD_MARKET;
      } else if (lower.includes('almoc') || lower.includes('jantar') || lower.includes('restaurante') || lower.includes('ifood') || lower.includes('lanche')) {
        category = ExpenseCategory.RESTAURANT;
      } else if (lower.includes('uber') || lower.includes('gasolina') || lower.includes('metro') || lower.includes('transporte')) {
        category = ExpenseCategory.TRANSPORTATION;
      } else if (lower.includes('farmacia') || lower.includes('medico') || lower.includes('remedio')) {
        category = ExpenseCategory.HEALTH;
      } else if (lower.includes('luz') || lower.includes('agua') || lower.includes('internet') || lower.includes('energia')) {
        category = ExpenseCategory.UTILITIES;
      }

      let title = text
        .replace(/(?:gastei|paguei|comprei|valor|r\$|\d+(?:[.,]\d{1,2})?|reais|compartilhad[ao]|privad[ao])/gi, '')
        .trim();
      if (!title) title = 'Gasto via WhatsApp';

      return {
        intent: AIIntent.CREATE_EXPENSE,
        confidence: 0.85,
        data: {
          title: title.charAt(0).toUpperCase() + title.slice(1),
          amount,
          category,
          scope,
        },
      };
    }

    return {
      intent: AIIntent.UNKNOWN,
      confidence: 0.3,
      data: {
        title: text,
        scope: RecordScope.PRIVATE,
      },
    };
  }
}
