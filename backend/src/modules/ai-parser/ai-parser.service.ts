import * as XLSX from "xlsx";
import { Injectable, Logger } from "@nestjs/common";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { ConfigService } from "@nestjs/config";
import {
  AIIntent,
  ExpenseCategory,
  RecordScope,
  ParsedWhatsAppResultDto,
} from "../../../../packages/shared/src";

@Injectable()
export class AiParserService {
  private readonly logger = new Logger(AiParserService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>("GEMINI_API_KEY");
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
            AIIntent.QUERY_CALENDAR,
            AIIntent.QUERY_TASKS,
            AIIntent.QUERY_SHOPPING_LIST,
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
            items: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  name: { type: SchemaType.STRING },
                  quantity: { type: SchemaType.STRING },
                  category: { type: SchemaType.STRING },
                },
                required: ["name"],
              },
            },
          },
          required: ["title", "scope"],
        },
      },
      required: ["intent", "confidence", "data"],
    };
  }

  async parseMessage(messageText: string, now: Date = new Date()): Promise<ParsedWhatsAppResultDto> {
    const referenceIso = now.toISOString();

    // 1. Tentar via Gemini API com Structured Outputs
    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: "gemini-3.5-flash-lite",
          generationConfig: {
            responseMimeType: "application/json",
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

0. CONSULTAS E VISUALIZAÇÃO (QUERY_CALENDAR, QUERY_TASKS, QUERY_SHOPPING_LIST):
- Se o usuário pedir para ver, falar ou mostrar sua agenda / compromissos de hoje ou próximos (ex: "Me fale minha agenda para hoje", "minha agenda", "o que tenho na agenda hoje?", "quais meus compromissos de hoje?"):
  Classifique OBRIGATORIAMENTE como QUERY_CALENDAR.
- Se o usuário pedir para ver, falar ou mostrar seus lembretes ou tarefas pendentes (ex: "me fale meus lembretes", "quais meus lembretes", "minhas tarefas", "o que tenho para fazer?"):
  Classifique OBRIGATORIAMENTE como QUERY_TASKS.
- Se o usuário pedir para ver, falar ou mostrar sua lista de compras (ex: "me mostre minha lista de compras", "minha lista de compras", "o que tem para comprar?", "o que preciso comprar no mercado?"):
  Classifique OBRIGATORIAMENTE como QUERY_SHOPPING_LIST.

1. COMPROMISSOS, REUNIÕES E EVENTOS DE AGENDA (CREATE_EVENT):
- Se indicar o agendamento de um compromisso de calendário, evento, reunião, consulta médica, voo, aniversário ou festa (ex: "colocar evento na minha agenda: 7 de outubro de 2026 às 17h - evento teste whatsapp", "agendar 7 de outubro de 2026 às 17h - evento teste whatsapp", "Agendar reunião amanhã às 15h", "Dentista quinta 14:00", "Adicionar evento Aniversário do João dia 20/11", "Compromisso médico sexta"):
  Classifique como CREATE_EVENT.
- "title": título do compromisso limpo (ex: "evento teste whatsapp", "Reunião de Alinhamento", "Dentista", "Aniversário do João"). Remova prefixos como "colocar evento na minha agenda:", "agendar", datas e horários.
- "startDate": data e hora ISO com offset de Brasília UTC-3 (exemplo: para 17h retorne exatamente "2026-10-07T17:00:00-03:00", NUNCA use "Z").
- "endDate": data e hora de término ISO (se não informado, assuma 1 hora após startDate).
- "isAllDay": true se for dia inteiro sem hora específica, false se tiver hora.
- "location": local se mencionado (ex: "Consultório Dr. Paulo", "Google Meet").
- "scope": PRIVATE por padrão. Somente SHARED se disser expressamente compartilhado, nossa agenda, do casal ou juntos.

2. LISTA DE COMPRAS (CREATE_SHOPPING_ITEM):
- Se a mensagem indicar itens a comprar ou adicionar na lista (ex: "comprar leite, queijo e ovos", "colocar pão na lista de compras", "adicionar na lista de mercado café e açúcar"):
  Classifique OBRIGATORIAMENTE como CREATE_SHOPPING_ITEM.
- "items": extraia cada item em um elemento do array com "name" capitalizado e "quantity" ("1" se não especificado).

3. METAS (CREATE_GOAL):
- SE a mensagem contiver "meta", "na meta", "nova meta", "objetivo", "guardar", "poupar", "juntar dinheiro" (ex: "Adicionar viagem para Itália na meta com gasto de 10.000", "Meta reforma 5000", "Guardar 2000 na meta carro"):
  Classifique OBRIGATORIAMENTE como CREATE_GOAL, mesmo que use palavras como "gasto", "comprar" ou "pagar".
- "amount": extraia o valor alvo numérico (ex: 10000).
- "title": limpe o título deixando apenas o nome da meta (ex: "Viagem para Itália").
- "scope": PRIVATE por padrão. Somente SHARED se disser expressamente compartilhado/nossa meta/juntos.

4. LEMBRETES E TAREFAS (CREATE_TASK):
- Se indicar um lembrete, aviso ou prazo pontual (ex: "Pagar conta de luz daqui 10 minutos", "Lembrar de comprar pão", "Me lembre de ligar para o cliente"):
  Classifique como CREATE_TASK.
- "title": o texto do lembrete limpo sem "lembrar de", "me lembre" (ex: "Pagar conta de luz", "Comprar pão").
- "dueDate": calcule a data e hora ISO exata calculada a partir da data de referência (${referenceIso}).
- "hasSpecificTime": true se o usuário informou um horário ou minutos/horas específicas. false se não informou.
- "scope": PRIVATE por padrão.

5. GASTOS E DESPESAS (CREATE_EXPENSE):
- Gastos imediatos já realizados (ex: "Gastei 45 no mercado compartilhado", "Almoço 32", "Farmácia 25").
- "scope": PRIVATE por padrão. Somente SHARED se disser explicitamente compartilhado, da casa ou juntos.
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
    const cleanMimeType = (mimeType || "image/jpeg").split(";")[0].trim();

    // Se for arquivo de planilha Excel (.xlsx, .xls) ou CSV, converte para texto estruturado
    if (
      cleanMimeType.includes("spreadsheet") ||
      cleanMimeType.includes("excel") ||
      cleanMimeType.includes("csv") ||
      (caption && /\.(xlsx|xls|csv)$/i.test(caption))
    ) {
      try {
        const workbook = XLSX.read(mediaBuffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const tableText = rows
          .map((r) => (Array.isArray(r) ? r.filter(Boolean).join(" | ") : ""))
          .filter(Boolean)
          .join("\n");
        this.logger.log(`Planilha convertida em texto (linhas: ${rows.length}): \n${tableText.slice(0, 300)}...`);
        return this.parseMessage("Adicionar na lista de compras os seguintes itens da planilha:\n" + tableText, now);
      } catch (err) {
        this.logger.warn(`Erro ao extrair planilha via xlsx: ${err}`);
      }
    }

    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: "gemini-3.5-flash-lite",
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: this.getParserSchema(),
          },
        });

        const prompt = `Você é o assistente inteligente multimodal do Nexo (gestão financeira e rotina pessoal/casal).
Data e hora atual de referência: ${referenceIso} (fuso horário de Brasília UTC-3).
${caption ? `Legenda da mensagem enviada pelo usuário: "${caption}"` : ""}

Analise com precisão a mídia fornecida (pode ser foto de comprovante/recibo/cupom fiscal/nota fiscal/produto/meta ou áudio de voz em português) e extraia os dados estruturados:

REGRA DE OURO SOBRE ESCOPO:
- O escopo DEFAULT OBRIGATÓRIO é "PRIVATE".
- SOMENTE defina "SHARED" se a legenda ou o áudio contiver expressamente palavras como "compartilhado", "compartilhada", "compartilhar", "para nós", "pra nós", "juntos", "do casal", "nossa", "da casa".
- Caso contrário, defina SEMPRE "PRIVATE".

DIRETRIZES DE RECONHECIMENTO:
1. AGENDAMENTO DE EVENTOS / COMPROMISSOS (CREATE_EVENT):
   - Se o áudio for para agendar compromisso, evento, reunião, consulta médica ou festa (ex: áudio falando "agendar 7 de outubro de 2026 às 17h - evento teste whatsapp", "colocar evento na minha agenda amanhã às 14 horas dentista", "marcar reunião sexta às 10h"):
     - intent: "CREATE_EVENT"
     - title: título limpo do compromisso (ex: "evento teste whatsapp", "dentista", "reunião").
     - startDate: data e hora ISO exata calculada a partir de ${referenceIso} (fuso Brasília UTC-3).
     - endDate: 1 hora após startDate (ou especificado).
     - isAllDay: false se tiver horário, true se dia inteiro.

2. CONSULTAS DE AGENDA, LEMBRETES OU COMPRAS (QUERY_CALENDAR, QUERY_TASKS, QUERY_SHOPPING_LIST):
   - Se o áudio perguntar pela agenda do dia (ex: "me fale minha agenda para hoje", "o que tenho na agenda hoje?"):
     - intent: "QUERY_CALENDAR"
   - Se o áudio perguntar pelos lembretes/tarefas (ex: "me fale meus lembretes", "quais minhas tarefas?"):
     - intent: "QUERY_TASKS"
   - Se o áudio perguntar pela lista de compras (ex: "me mostre minha lista de compras", "o que tem pra comprar?"):
     - intent: "QUERY_SHOPPING_LIST"

3. LISTA DE COMPRAS (CREATE_SHOPPING_ITEM):
   - Se o áudio ou imagem/planilha listar itens para comprar (ex: áudio dizendo "comprar leite, queijo e café" ou "colocar pão e manteiga na lista de compras"):
     - intent: "CREATE_SHOPPING_ITEM"
     - items: array de itens com name e quantity.

4. COMPROVANTES, RECIBOS E CUPONS FISCAIS OU ÁUDIO DE GASTO (CREATE_EXPENSE):
   - Se for foto de comprovante Pix, recibo de máquina de cartão, cupom fiscal, fatura ou nota fiscal:
     - intent: "CREATE_EXPENSE"
     - amount: extraia o VALOR TOTAL pago como número decimal (ex: 78.90).
     - title: nome do estabelecimento ou descrição do gasto (ex: "Supermercado Extra", "Posto Ipiranga", "Almoço Restaurante", "Farmácia Droga Raia").
     - category: deduza a categoria mais adequada entre FOOD_MARKET, RESTAURANT, TRANSPORTATION, HEALTH, UTILITIES, LEISURE, SUBSCRIPTIONS, OTHER.
   - Se for áudio onde a pessoa fala sobre uma compra/gasto realizado (ex: "Gastei 60 reais no açougue hoje"):
     - intent: "CREATE_EXPENSE"
     - amount: o valor mencionado.
     - title: o que foi comprado/gasto.
     - category: a categoria correspondente.

5. METAS FINANCEIRAS E OBJETIVOS (CREATE_GOAL):
   - Se a mídia for um áudio ou foto com legenda referente a poupar, guardar dinheiro, comprar um bem futuro ou objetivo financeiro (ex: áudio dizendo "Quero criar uma meta de 15 mil reais para reforma da casa" ou foto de viagem com legenda "Meta de 10.000 para Paris"):
     - intent: "CREATE_GOAL"
     - amount: o valor monetário alvo da meta.
     - title: o nome limpo do objetivo (ex: "Reforma da casa", "Viagem para Paris").

6. LEMBRETES E TAREFAS (CREATE_TASK):
   - Se for áudio pedindo para lembrar de algo (ex: "lembrar de pagar condomínio dia 10", "me lembre de ligar para a mamãe"):
     - intent: "CREATE_TASK"
     - title: descrição do compromisso/tarefa.
     - dueDate: data e hora calculada a partir de ${referenceIso}.
     - hasSpecificTime: true se informou hora/minuto, false se apenas o dia.`;

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: mediaBuffer.toString("base64"),
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
        title: "Mídia não identificada",
        scope: RecordScope.PRIVATE,
      },
    };
  }

  private heuristicFallback(text: string, now: Date): ParsedWhatsAppResultDto {
    const lower = text.toLowerCase();

    // Detecção de valores monetários (ex: 10.000, 10000, 45, 45.90, R$ 45,00, 150 reais)
    const sanitizedAmountText = text.replace(/(\d+)\.(\d{3})/g, "$1$2");
    const amountMatch = sanitizedAmountText.match(/(?:r\$|reais)?\s*(\d+(?:[.,]\d{1,2})?)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(",", ".")) : undefined;

    // Detecção de escopo estritamente por palavras explícitas
    const isShared =
      lower.includes("compartilhad") ||
      lower.includes("compartilhar") ||
      lower.includes("juntos") ||
      lower.includes("casal") ||
      lower.includes("para nós") ||
      lower.includes("pra nós") ||
      lower.includes("nossa") ||
      lower.includes("nosso");

    const scope = isShared ? RecordScope.SHARED : RecordScope.PRIVATE;

    // -1. CONSULTAS (QUERIES) VIA WHATSAPP
    // A. Consulta de Agenda
    if (
      lower.includes("minha agenda") ||
      lower.includes("agenda de hoje") ||
      lower.includes("agenda para hoje") ||
      lower.includes("agenda pra hoje") ||
      lower.includes("compromissos de hoje") ||
      lower.includes("compromissos para hoje") ||
      lower.includes("compromissos pra hoje") ||
      /^me\s+(?:fale|mostre|diga|passe)\s+(?:a\s+)?agenda/i.test(lower) ||
      /^o\s+que\s+tenho\s+(?:na\s+agenda|para\s+hoje|pra\s+hoje)/i.test(lower) ||
      /^quais\s+(?:são\s+)?(?:os\s+)?(?:meus\s+)?compromissos/i.test(lower)
    ) {
      if (
        !lower.includes("colocar") &&
        !lower.includes("adicionar") &&
        !lower.includes("agendar") &&
        !lower.includes("marcar") &&
        !lower.includes("criar") &&
        !lower.includes("novo evento")
      ) {
        return {
          intent: AIIntent.QUERY_CALENDAR,
          confidence: 0.95,
          data: {
            title: "Consulta de Agenda",
            scope,
          },
        };
      }
    }

    // B. Consulta de Lembretes / Tarefas
    if (
      lower.includes("meus lembretes") ||
      lower.includes("minhas tarefas") ||
      /^me\s+(?:fale|mostre|diga|passe)\s+(?:os\s+)?lembretes/i.test(lower) ||
      /^me\s+(?:fale|mostre|diga|passe)\s+(?:as\s+)?tarefas/i.test(lower) ||
      /^o\s+que\s+tenho\s+(?:para|pra)\s+fazer/i.test(lower) ||
      /^quais\s+(?:são\s+)?(?:os\s+)?(?:meus\s+)?lembretes/i.test(lower) ||
      /^quais\s+(?:são\s+)?(?:as\s+)?(?:minhas\s+)?tarefas/i.test(lower)
    ) {
      if (
        !lower.includes("lembrar de") &&
        !lower.includes("me lembre de") &&
        !lower.includes("adicionar") &&
        !lower.includes("criar")
      ) {
        return {
          intent: AIIntent.QUERY_TASKS,
          confidence: 0.95,
          data: {
            title: "Consulta de Lembretes",
            scope,
          },
        };
      }
    }

    // C. Consulta de Lista de Compras
    if (
      lower.includes("minha lista de compras") ||
      lower.includes("minha lista de mercado") ||
      /^me\s+(?:fale|mostre|diga|passe)\s+(?:a\s+)?lista\s+de\s+(?:compras|mercado)/i.test(lower) ||
      /^(?:ver|mostrar|qual\s+é\s+a)\s+lista\s+de\s+(?:compras|mercado)/i.test(lower) ||
      /^o\s+que\s+tem\s+(?:para|pra)\s+comprar/i.test(lower) ||
      /^o\s+que\s+preciso\s+comprar/i.test(lower)
    ) {
      if (
        !lower.includes("adicionar") &&
        !lower.includes("colocar") &&
        !lower.includes("bota") &&
        !lower.includes("botar") &&
        !lower.startsWith("comprar ")
      ) {
        return {
          intent: AIIntent.QUERY_SHOPPING_LIST,
          confidence: 0.95,
          data: {
            title: "Consulta de Lista de Compras",
            scope,
          },
        };
      }
    }

    // 0. PRIORIDADE: Detecção de Lista de Compras
    if (
      lower.includes("lista de compras") ||
      lower.includes("lista de mercado") ||
      lower.includes("adicionar na lista") ||
      lower.includes("colocar na lista") ||
      (lower.startsWith("comprar ") && amount === undefined)
    ) {
      const clean = text
        .replace(/(?:adicionar|colocar|por|bota|botar)?\s*(?:na|pra|para)?\s*lista\s*(?:de\s*(?:compras|mercado))?/gi, "")
        .replace(/^comprar\s*/gi, "")
        .trim();

      const rawItems = clean.split(/[\n,;•-]+/).map((s) => s.trim()).filter(Boolean);
      const items = (rawItems.length > 0 ? rawItems : [clean]).map((it) => ({
        name: it.charAt(0).toUpperCase() + it.slice(1),
        quantity: "1",
      }));

      return {
        intent: AIIntent.CREATE_SHOPPING_ITEM,
        confidence: 0.9,
        data: {
          title: "Lista de Compras",
          scope,
          items,
        },
      };
    }

    // 1. PRIORIDADE MÁXIMA: Detecção de Meta
    if (
      lower.includes("meta") ||
      lower.includes("guardar") ||
      lower.includes("poupar") ||
      lower.includes("objetivo")
    ) {
      let cleanTitle = text
        .replace(/^(?:adicionar|criar|nova)\s+/i, "")
        .replace(/\s*(?:na|pra|para|em)\s+meta(?:\s+com|\s+de)?.*$/i, "")
        .replace(/^meta\s*(?:de|para)?\s*/i, "")
        .replace(/(?:gasto\s+de|valor\s+de|r\$|\d+(?:[.,]\d+)?|reais|compartilhad[ao]|privad[ao])/gi, "")
        .trim();
      if (!cleanTitle) cleanTitle = "Nova Meta";

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
    const isEventIntent =
      lower.includes("agendar") ||
      lower.includes("marcar") ||
      lower.includes("colocar evento") ||
      lower.includes("criar evento") ||
      lower.includes("adicionar evento") ||
      lower.includes("novo evento") ||
      lower.includes("reunião") ||
      lower.includes("reuniao") ||
      lower.includes("consulta") ||
      lower.includes("aniversário") ||
      lower.includes("aniversario") ||
      ((lower.includes("agenda") || lower.includes("evento")) &&
        (lower.includes("às") || lower.includes(" as ") || lower.includes("dia ")));

    if (isEventIntent) {
      const monthsMap: Record<string, number> = {
        janeiro: 0, jan: 0,
        fevereiro: 1, fev: 1,
        março: 2, marco: 2, mar: 2,
        abril: 3, abr: 3,
        maio: 4, mai: 4,
        junho: 5, jun: 5,
        julho: 6, jul: 6,
        agosto: 7, ago: 7,
        setembro: 8, set: 8,
        outubro: 9, out: 9,
        novembro: 10, nov: 10,
        dezembro: 11, dez: 11,
      };

      let year = now.getFullYear();
      let month = now.getMonth();
      let day = now.getDate() + 1;
      let hour = 9;
      let minute = 0;
      let foundDate = false;
      let foundTime = false;
      let isAllDay = true;

      // 1. "7 de outubro de 2026" ou "7 de outubro"
      const textDateMatch = lower.match(/(\d{1,2})\s+de\s+([a-zç]+)(?:\s+de\s+(\d{4}))?/i);
      if (textDateMatch) {
        const d = parseInt(textDateMatch[1], 10);
        const mStr = textDateMatch[2].toLowerCase();
        const yStr = textDateMatch[3];
        if (monthsMap[mStr] !== undefined) {
          day = d;
          month = monthsMap[mStr];
          if (yStr) year = parseInt(yStr, 10);
          foundDate = true;
        }
      }

      // 2. "07/10/2026" ou "07/10" ou "dia 07/10"
      if (!foundDate) {
        const slashMatch = lower.match(/(?:dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/i);
        if (slashMatch) {
          day = parseInt(slashMatch[1], 10);
          month = parseInt(slashMatch[2], 10) - 1;
          if (slashMatch[3]) {
            let y = parseInt(slashMatch[3], 10);
            if (y < 100) y += 2000;
            year = y;
          }
          foundDate = true;
        }
      }

      // 3. "dia 15"
      if (!foundDate) {
        const dayOnlyMatch = lower.match(/dia\s+(\d{1,2})\b/i);
        if (dayOnlyMatch) {
          day = parseInt(dayOnlyMatch[1], 10);
          month = now.getMonth();
          year = now.getFullYear();
          foundDate = true;
        }
      }

      // 4. "hoje" ou "amanhã"
      if (!foundDate) {
        if (lower.includes("hoje")) {
          day = now.getDate();
          month = now.getMonth();
          year = now.getFullYear();
          foundDate = true;
        } else if (lower.includes("amanha") || lower.includes("amanhã")) {
          const tom = new Date(now.getTime() + 24 * 3600 * 1000);
          day = tom.getDate();
          month = tom.getMonth();
          year = tom.getFullYear();
          foundDate = true;
        }
      }

      // Horário: "às 17h", "às 17:30", "às 17h30", "17h", "17:30"
      const timeMatch = lower.match(/(?:(?:às|as)\s+)?(\d{1,2})(?:h|:)(\d{2})?|(?:às|as)\s+(\d{1,2})h?/i);
      if (timeMatch) {
        if (timeMatch[1]) {
          hour = parseInt(timeMatch[1], 10);
          minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          foundTime = true;
          isAllDay = false;
        } else if (timeMatch[3]) {
          hour = parseInt(timeMatch[3], 10);
          minute = 0;
          foundTime = true;
          isAllDay = false;
        }
      }

      const eventDate = new Date(year, month, day, foundTime ? hour : 0, foundTime ? minute : 0, 0);
      const endDate = new Date(eventDate.getTime() + (isAllDay ? 24 * 3600 * 1000 : 60 * 60 * 1000));

      let cleanTitle = text;
      if (text.includes(" - ")) {
        cleanTitle = text.split(" - ").slice(1).join(" - ").trim();
      } else if (text.includes(" : ")) {
        cleanTitle = text.split(" : ").slice(1).join(" : ").trim();
      } else {
        cleanTitle = cleanTitle
          .replace(/^(?:colocar\s+evento\s+(?:na\s+minha\s+agenda)?|agendar\s+evento|agendar|marcar\s+evento|marcar|adicionar\s+evento|criar\s+evento|novo\s+evento)\s*:?\s*/gi, "")
          .replace(/\b\d{1,2}\s+de\s+[a-zç]+(?:\s+de\s+\d{4})?/gi, "")
          .replace(/\b(?:dia\s+)?\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/gi, "")
          .replace(/\bdia\s+\d{1,2}\b/gi, "")
          .replace(/(?:(?:às|as)\s+)?\d{1,2}(?:h|:\d{2})\b/gi, "")
          .replace(/(?:^|\s+)(?:hoje|amanhã|amanha)(?:\s+|$)/gi, " ")
          .replace(/^[-–—:\s]+|[-–—:\s]+$/g, "")
          .trim();
      }
      if (!cleanTitle) cleanTitle = "Compromisso";

      return {
        intent: AIIntent.CREATE_EVENT,
        confidence: 0.9,
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
      lower.startsWith("lembr") ||
      lower.includes("lembrar") ||
      lower.includes("pagar conta") ||
      lower.includes("compromisso") ||
      lower.includes("nao esquecer") ||
      lower.includes("daqui")
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
        .replace(/^(?:me\s+)?lembr(?:ar|e|a)?\s*(?:de)?/i, "")
        .replace(/(?:daqui\s+\d+\s+min(?:utos)?|daqui\s+\d+\s+horas?)/gi, "")
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
      if (lower.includes("mercado") || lower.includes("compras") || lower.includes("feira")) {
        category = ExpenseCategory.FOOD_MARKET;
      } else if (lower.includes("almoc") || lower.includes("jantar") || lower.includes("restaurante") || lower.includes("ifood") || lower.includes("lanche")) {
        category = ExpenseCategory.RESTAURANT;
      } else if (lower.includes("uber") || lower.includes("gasolina") || lower.includes("metro") || lower.includes("transporte")) {
        category = ExpenseCategory.TRANSPORTATION;
      } else if (lower.includes("farmacia") || lower.includes("medico") || lower.includes("remedio")) {
        category = ExpenseCategory.HEALTH;
      } else if (lower.includes("luz") || lower.includes("agua") || lower.includes("internet") || lower.includes("energia")) {
        category = ExpenseCategory.UTILITIES;
      }

      let title = text
        .replace(/(?:gastei|paguei|comprei|valor|r\$|\d+(?:[.,]\d{1,2})?|reais|compartilhad[ao]|privad[ao])/gi, "")
        .trim();
      if (!title) title = "Gasto via WhatsApp";

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
