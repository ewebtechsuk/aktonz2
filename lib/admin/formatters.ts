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
