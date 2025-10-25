const DEFAULT_ADMIN_LOCALE = 'en-GB';

export const DATE_ONLY: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
};

export const DATE_TIME_WITH_HOURS: Intl.DateTimeFormatOptions = {
  ...DATE_ONLY,
  hour: '2-digit',
  minute: '2-digit',
};

export const DATE_TIME_WITH_SECONDS: Intl.DateTimeFormatOptions = {
  ...DATE_TIME_WITH_HOURS,
  second: '2-digit',
};

function parseDateInput(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const timestamp =
    typeof value === 'number' || typeof value === 'string' ? new Date(value) : new Date(value as any);

  if (Number.isNaN(timestamp.getTime())) {
    return null;
  }

  return timestamp;
}

export function parseAdminDate(value: unknown): Date | null {
  return parseDateInput(value);
}

export function createAdminDateFormatter(
  options: Intl.DateTimeFormatOptions = DATE_TIME_WITH_HOURS,
  locale: string = DEFAULT_ADMIN_LOCALE,
): ((value: unknown) => string | null) {
  let formatter: Intl.DateTimeFormat | null = null;

  const resolveFormatter = (): Intl.DateTimeFormat | null => {
    if (formatter) {
      return formatter;
    }

    try {
      formatter = new Intl.DateTimeFormat(locale, options);
      return formatter;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Unable to create admin date formatter', error);
      }

      formatter = null;
      return null;
    }
  };

  return (value: unknown) => {
    const parsed = parseDateInput(value);
    if (!parsed) {
      return null;
    }

    const resolvedFormatter = resolveFormatter();
    if (!resolvedFormatter) {
      return formatAdminDate(value, options, locale);
    }

    try {
      return resolvedFormatter.format(parsed);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Unable to format admin date value', error);
      }

      return formatAdminDate(value, options, locale);
    }
  };
}

function parseNumberInput(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const normalized = trimmed.replace(/[^0-9+\-.,]/g, '').replace(/,(?=\d{3}(?:\D|$))/g, '');
    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  if (typeof value === 'object' && value !== null && 'valueOf' in value) {
    const raw = Number((value as { valueOf: () => unknown }).valueOf());
    return Number.isFinite(raw) ? raw : null;
  }

  return null;
}

export function formatAdminDate(
  value: unknown,
  options: Intl.DateTimeFormatOptions = DATE_TIME_WITH_HOURS,
  locale: string = DEFAULT_ADMIN_LOCALE,
): string | null {
  const parsed = parseDateInput(value);
  if (!parsed) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(locale, options).format(parsed);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Unable to format admin date value', error);
    }
    return null;
  }
}

export function formatAdminDateOrDash(
  value: unknown,
  options: Intl.DateTimeFormatOptions = DATE_TIME_WITH_HOURS,
  fallback: string = '—',
  locale: string = DEFAULT_ADMIN_LOCALE,
): string {
  return formatAdminDate(value, options, locale) ?? fallback;
}

export function getAdminDateSortValue(value: unknown): number {
  const parsed = parseDateInput(value);
  if (!parsed) {
    return 0;
  }

  return parsed.getTime();
}

export function getAdminTimestamp(value: unknown): number {
  return getAdminDateSortValue(value);
}

export function resolveLatestAdminTimestamp(...values: unknown[]): number {
  return values.reduce<number>((latest, value) => {
    const timestamp = getAdminTimestamp(value);
    return timestamp > latest ? timestamp : latest;
  }, 0);
}

export function formatAdminNumber(
  value: unknown,
  options: Intl.NumberFormatOptions = {},
  locale: string = DEFAULT_ADMIN_LOCALE,
): string | null {
  const parsed = parseNumberInput(value);
  if (parsed === null) {
    return null;
  }

  try {
    return new Intl.NumberFormat(locale, options).format(parsed);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Unable to format admin number value', error);
    }

    const { minimumFractionDigits = 0, maximumFractionDigits = 3 } = options;
    return parsed.toLocaleString(locale, { minimumFractionDigits, maximumFractionDigits });
  }
}

export function formatAdminNumberOrDash(
  value: unknown,
  options: Intl.NumberFormatOptions = {},
  fallback: string = '—',
  locale: string = DEFAULT_ADMIN_LOCALE,
): string {
  return formatAdminNumber(value, options, locale) ?? fallback;
}

function normalizeCurrencyCode(currency: unknown, fallback: string = 'GBP'): string {
  if (typeof currency === 'string' && currency.trim()) {
    return currency.trim().toUpperCase();
  }

  return fallback;
}

export function formatAdminCurrency(
  value: unknown,
  currency: unknown = 'GBP',
  options: Intl.NumberFormatOptions = {},
  locale: string = DEFAULT_ADMIN_LOCALE,
): string | null {
  const parsed = parseNumberInput(value);
  if (parsed === null) {
    return null;
  }

  const currencyCode = normalizeCurrencyCode(currency);
  const resolvedOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  };

  try {
    return new Intl.NumberFormat(locale, resolvedOptions).format(parsed);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Unable to format admin currency value', error);
    }

    const { minimumFractionDigits = 0, maximumFractionDigits = 2 } = resolvedOptions;
    const amount = parsed.toLocaleString(locale, { minimumFractionDigits, maximumFractionDigits });
    return `${currencyCode} ${amount}`;
  }
}

export function formatAdminCurrencyOrDash(
  value: unknown,
  currency: unknown = 'GBP',
  options: Intl.NumberFormatOptions = {},
  fallback: string = '—',
  locale: string = DEFAULT_ADMIN_LOCALE,
): string {
  return formatAdminCurrency(value, currency, options, locale) ?? fallback;
}
