/**
 * Utilitários de Máscaras e Formatação de Entrada de Dados para o Nexo:
 * - Data (DD/MM/AAAA)
 * - Número de Telefone (+DDI DDD XXXXX-XXXX)
 * - Horário (HH:MM)
 * - Dinheiro (R$ XX,XX)
 * - Data e Horário (DD/MM/AAAA HH:MM)
 */

export type MaskType = 'date' | 'phone' | 'time' | 'currency' | 'datetime';

/**
 * Máscara de Data no formato DD/MM/AAAA
 * Exemplo: '07102026' -> '07/10/2026'
 */
export function maskDate(value?: string | null): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Remove a máscara de data retornando apenas dígitos (DDMMAAAA)
 */
export function unmaskDate(value?: string | null): string {
  if (!value) return '';
  return value.replace(/\D/g, '').slice(0, 8);
}

/**
 * Converte data mascarada DD/MM/AAAA para ISO YYYY-MM-DD
 */
export function parseDateInputToIso(value?: string | null): string | undefined {
  if (!value) return undefined;
  const parts = value.trim().split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    if (day.length === 2 && month.length === 2 && year.length === 4) {
      return `${year}-${month}-${day}`;
    }
  }
  return undefined;
}

/**
 * Máscara de Horário no formato HH:MM (00:00 a 23:59)
 * Exemplo: '0900' -> '09:00', '2359' -> '23:59'
 */
export function maskTime(value?: string | null): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length === 0) return '';
  if (digits.length === 1) return digits;

  // Validação suave de horas (00 a 23)
  let hours = digits.slice(0, 2);
  const numHours = parseInt(hours, 10);
  if (numHours > 23) {
    hours = '23';
  }

  if (digits.length <= 2) {
    return hours;
  }

  // Validação suave de minutos (00 a 59)
  let minutes = digits.slice(2, 4);
  if (minutes.length === 2) {
    const numMinutes = parseInt(minutes, 10);
    if (numMinutes > 59) {
      minutes = '59';
    }
  }

  return `${hours}:${minutes}`;
}

/**
 * Remove a máscara de horário retornando apenas os dígitos HHMM
 */
export function unmaskTime(value?: string | null): string {
  if (!value) return '';
  return value.replace(/\D/g, '').slice(0, 4);
}

/**
 * Máscara de Número de Telefone (+ddi ddd xxxxx-xxxx)
 * Suporta formatos celulares de 9 dígitos e fixos de 8 dígitos.
 * Exemplos:
 * - '5511999998888' -> '+55 11 99999-8888'
 * - '11999998888'   -> '+55 11 99999-8888' (preenche DDI Brasil padrão se omitido ao colar)
 * - '551133334444'  -> '+55 11 3333-4444' (fixo)
 */
export function maskPhone(value?: string | null): string {
  if (!value) return '';
  const raw = value.trim();
  const digits = raw.replace(/\D/g, '');

  if (!digits) {
    return raw.startsWith('+') ? '+' : '';
  }

  // Se colar 10 ou 11 dígitos sem DDI explícito (ex: DDD 11 + celular)
  let cleanDigits = digits;
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith('55') && !raw.startsWith('+')) {
    cleanDigits = `55${digits}`;
  }

  // Limite máximo de 13 dígitos (+DDI 2 + DDD 2 + 9 dígitos celular)
  cleanDigits = cleanDigits.slice(0, 13);

  const ddi = cleanDigits.slice(0, 2);
  const ddd = cleanDigits.slice(2, 4);
  const rest = cleanDigits.slice(4);

  if (cleanDigits.length <= 2) {
    return `+${ddi}`;
  }
  if (cleanDigits.length <= 4) {
    return `+${ddi} ${ddd}`;
  }

  // Até 8 dígitos no corpo do telefone (número fixo ou digitação em andamento)
  if (rest.length <= 4) {
    return `+${ddi} ${ddd} ${rest}`;
  }
  if (rest.length <= 8) {
    return `+${ddi} ${ddd} ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }

  // 9 dígitos no corpo do telefone celular: XXXXX-XXXX
  return `+${ddi} ${ddd} ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
}

/**
 * Remove a máscara de telefone retornando os dígitos ou com '+'
 */
export function unmaskPhone(value?: string | null): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}

/**
 * Máscara de Dinheiro no padrão brasileiro (R$ XX,XX)
 * Digitação fluida estilo aplicativo bancário / centavos progressivos.
 * Exemplos:
 * - 50.5 -> 'R$ 50,50'
 * - '1' -> 'R$ 0,01'
 * - '100' -> 'R$ 1,00'
 * - '125050' -> 'R$ 1.250,50'
 */
export function maskCurrency(value?: string | number | null): string {
  if (value === undefined || value === null || value === '') return '';

  if (typeof value === 'number') {
    if (isNaN(value)) return '';
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const digits = value.replace(/\D/g, '');
  if (!digits) return '';

  const cents = parseInt(digits, 10);
  const numberValue = cents / 100;

  return numberValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Converte valor em dinheiro mascarado para float/número
 * Exemplo: 'R$ 1.250,50' -> 1250.50
 */
export function unmaskCurrency(value?: string | null): number {
  if (!value) return 0;
  const digits = value.replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

/**
 * Máscara combinada de Data e Horário (DD/MM/AAAA HH:MM)
 * Usada para lembretes e tarefas com prazo e hora.
 * Exemplo: '301020261500' -> '30/10/2026 15:00'
 */
export function maskDateTime(value?: string | null): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 12);
  if (digits.length <= 8) {
    return maskDate(digits);
  }
  const datePart = maskDate(digits.slice(0, 8));
  const timePart = maskTime(digits.slice(8));
  return `${datePart} ${timePart}`;
}

/**
 * Aplica máscara correspondente dinamicamente
 */
export function applyMask(value: string, mask: MaskType): string {
  switch (mask) {
    case 'date':
      return maskDate(value);
    case 'phone':
      return maskPhone(value);
    case 'time':
      return maskTime(value);
    case 'currency':
      return maskCurrency(value);
    case 'datetime':
      return maskDateTime(value);
    default:
      return value;
  }
}
