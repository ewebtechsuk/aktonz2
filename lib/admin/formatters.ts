export const ADMIN_LOCALE = 'en-GB';

export type DateInput = Date | string | number | null | undefined;
export type NumericInput = number | string | null | undefined;

function isValidDate(date: Date): boolean {
  return Number.isFinite(date.getTime());
}

function normalizeDate(value: DateInput): Date | null {
  if (value instanceof Date) {
    return isValidDate(value) ? value : null;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null;
    }
    const date = new Date(value);
    return isValidDate(date) ? date : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const date = new Date(trimmed);
    return isValidDate(date) ? date : null;
  }

  return null;
}

function formatWithFormatter(formatter: Intl.DateTimeFormat, value: DateInput): string {
  const date = normalizeDate(value);
  return date ? formatter.format(date) : '';
}

export function parseAdminDate(value: DateInput): Date | null {
  return normalizeDate(value);
}

export function getAdminTimestamp(value: DateInput): number | null {
  const date = normalizeDate(value);
  return date ? date.getTime() : null;
}

export function resolveLatestAdminTimestamp(...values: DateInput[]): number | null {
  let latest: number | null = null;

  values.forEach((value) => {
    const timestamp = getAdminTimestamp(value);
    if (timestamp != null && (latest == null || timestamp > latest)) {
      latest = timestamp;
    }
  });

  return latest;
}

export function createAdminDateFormatter(
  options?: Intl.DateTimeFormatOptions,
): (value: DateInput) => string {
  const formatter = new Intl.DateTimeFormat(ADMIN_LOCALE, options);
  return (value: DateInput) => formatWithFormatter(formatter, value);
}

const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = Object.freeze({
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function formatAdminDate(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS,
): string {
  const formatter = new Intl.DateTimeFormat(ADMIN_LOCALE, options);
  return formatWithFormatter(formatter, value);
}

function normalizeNumber(value: NumericInput): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : null;
  }

  return null;
}

export interface AdminCurrencyFormatOptions {
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export function formatAdminCurrency(
  value: NumericInput,
  { currency = 'GBP', minimumFractionDigits, maximumFractionDigits }: AdminCurrencyFormatOptions = {},
): string {
  const numeric = normalizeNumber(value);
  if (numeric == null) {
    return '';
  }

  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
  };

  if (typeof minimumFractionDigits === 'number') {
    options.minimumFractionDigits = minimumFractionDigits;
  }

  if (typeof maximumFractionDigits === 'number') {
    options.maximumFractionDigits = maximumFractionDigits;
  }

  return new Intl.NumberFormat(ADMIN_LOCALE, options).format(numeric);
}

export function formatAdminNumber(
  value: NumericInput,
  options: Intl.NumberFormatOptions = {},
): string {
  const numeric = normalizeNumber(value);
  if (numeric == null) {
    return '';
  }

  return new Intl.NumberFormat(ADMIN_LOCALE, options).format(numeric);
}
