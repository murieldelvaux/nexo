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
    if (apiKey && apiKey !== 'your_gemini_api_key_here') {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async parseMessage(messageText: string): Promise<ParsedWhatsAppResultDto> {
    // 1. Tentar via Gemini API com Structured Outputs se a chave estiver configurada
    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: SchemaType.OBJECT,
              properties: {
                intent: {
                  type: SchemaType.STRING,
                  enum: [
                    AIIntent.CREATE_EXPENSE,
                    AIIntent.CREATE_TASK,
                    AIIntent.CREATE_GOAL,
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
                        ExpenseCategory.HOUSING,
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
                    notes: { type: SchemaType.STRING },
                  },
                  required: ['title', 'scope'],
                },
              },
              required: ['intent', 'confidence', 'data'],
            },
          },
        });

        const prompt = `Você é o interpretador oficial do assistente Nexo para casais.
Analise a mensagem em português e extraia as informações estruturadas:
Regras:
1. Gastos com mercado, contas da casa (luz, água, aluguel, internet), ou termos como "nós", "casa", "juntos" devem ter escopo SHARED.
2. Gastos individuais, almoço sozinho, itens pessoais ou "meu" devem ter escopo PRIVATE.
3. Se a mensagem indicar um lembrete (ex: "lembrar de...", "pagar conta dia X"), classifique como CREATE_TASK.
4. Se a mensagem indicar uma meta ou poupança (ex: "guardar X para viagem"), classifique como CREATE_GOAL.

Mensagem: "${messageText}"`;

        const result = await model.generateContent(prompt);
        const parsed = JSON.parse(result.response.text()) as ParsedWhatsAppResultDto;
        this.logger.log(`Parsed message via LLM: ${JSON.stringify(parsed)}`);
        return parsed;
      } catch (err) {
        this.logger.warn(`LLM parsing failed or timed out. Falling back to heuristic parser: ${err}`);
      }
    }

    // 2. Fallback Heurístico Robusto (Sem depender de API externa)
    return this.heuristicFallback(messageText);
  }

  private heuristicFallback(text: string): ParsedWhatsAppResultDto {
    const lower = text.toLowerCase();

    // Detecção de valores monetários (ex: 45, 45.90, R$ 45,00, 150 reais)
    const amountMatch = text.match(/(?:r\$|reais)?\s*(\d+(?:[.,]\d{1,2})?)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : undefined;

    // Detecção de escopo
    const isShared =
      lower.includes('compartilhad') ||
      lower.includes('casa') ||
      lower.includes('mercado') ||
      lower.includes('aluguel') ||
      lower.includes('condom') ||
      lower.includes('luz') ||
      lower.includes('agua') ||
      lower.includes('internet') ||
      lower.includes('juntos');

    const scope = isShared ? RecordScope.SHARED : RecordScope.PRIVATE;

    // Detecção de Lembrete / Tarefa
    if (lower.startsWith('lembr') || lower.includes('lembrar') || lower.includes('nao esquecer')) {
      return {
        intent: AIIntent.CREATE_TASK,
        confidence: 0.85,
        data: {
          title: text.replace(/^(?:me\s+)?lembr(?:ar|e|a)?\s*(?:de)?/i, '').trim(),
          scope,
        },
      };
    }

    // Detecção de Meta
    if (lower.startsWith('meta') || lower.includes('guardar') || lower.includes('poupar')) {
      return {
        intent: AIIntent.CREATE_GOAL,
        confidence: 0.85,
        data: {
          title: text.replace(/^meta\s*/i, '').trim(),
          amount: amount || 1000,
          scope,
        },
      };
    }

    // Detecção de Gasto
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

      // Limpar título da despesa
      let title = text
        .replace(/(?:gastei|paguei|comprei|valor|r\$|\d+(?:[.,]\d{1,2})?|reais|compartilhad[ao]|privad[ao])/gi, '')
        .trim();
      if (!title) title = 'Gasto via WhatsApp';

      return {
        intent: AIIntent.CREATE_EXPENSE,
        confidence: 0.8,
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
