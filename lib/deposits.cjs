const { formatRentFrequency, formatCurrencyGBP } = require('./format.cjs');

const WEEKS_PER_YEAR = 52;
const MONTHS_PER_YEAR = 12;
const QUARTERS_PER_YEAR = 4;

const DEPOSIT_TYPE_DURATIONS = {
  FIVE_WEEKS: { weeks: 5 },
  SIX_WEEKS: { weeks: 6 },
  FOUR_WEEKS: { weeks: 4 },
  THREE_WEEKS: { weeks: 3 },
  TWO_WEEKS: { weeks: 2 },
  ONE_WEEK: { weeks: 1 },
  ZERO_DEPOSIT: { weeks: 0 },
  ONE_MONTH: { months: 1 },
  TWO_MONTHS: { months: 2 },
  THREE_MONTHS: { months: 3 },
  FOUR_MONTHS: { months: 4 },
  SIX_MONTHS: { months: 6 },
};

function toNumber(value) {
  if (value == null) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const cleaned = trimmed.replace(/[^0-9.-]/g, '');
    if (!cleaned) {
      return null;
    }
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeFrequency(freq) {
  if (!freq) {
    return '';
  }
  const formatted = formatRentFrequency(freq);
  if (formatted) {
    return formatted.toLowerCase();
  }
  return String(freq).trim().toLowerCase();
}

function roundCurrency(value) {
  if (value == null) {
    return null;
  }
  if (!Number.isFinite(value)) {
    return null;
  }
  return Math.round(value);
}

function calculateWeeklyRent(priceValue, rentFrequency) {
  const amount = toNumber(priceValue);
  if (amount == null) {
    return null;
  }
  const frequency = normalizeFrequency(rentFrequency);
  switch (frequency) {
    case 'pw':
    case 'perweek':
    case 'weekly':
    case 'w':
      return amount;
    case 'pcm':
    case 'pm':
    case 'permonth':
    case 'monthly':
    case 'm':
      return (amount * MONTHS_PER_YEAR) / WEEKS_PER_YEAR;
    case 'pq':
    case 'perquarter':
    case 'quarterly':
    case 'q':
      return amount / (WEEKS_PER_YEAR / QUARTERS_PER_YEAR);
    case 'pa':
    case 'py':
    case 'perannum':
    case 'peryear':
    case 'annually':
    case 'yearly':
    case 'y':
      return amount / WEEKS_PER_YEAR;
    default:
      return amount;
  }
}

function calculateMonthlyRent(priceValue, rentFrequency) {
  const amount = toNumber(priceValue);
  if (amount == null) {
    return null;
  }
  const frequency = normalizeFrequency(rentFrequency);
  switch (frequency) {
    case 'pw':
    case 'perweek':
    case 'weekly':
    case 'w':
      return (amount * WEEKS_PER_YEAR) / MONTHS_PER_YEAR;
    case 'pcm':
    case 'pm':
    case 'permonth':
    case 'monthly':
    case 'm':
      return amount;
    case 'pq':
    case 'perquarter':
    case 'quarterly':
    case 'q':
      return amount / 3;
    case 'pa':
    case 'py':
    case 'perannum':
    case 'peryear':
    case 'annually':
    case 'yearly':
    case 'y':
      return amount / MONTHS_PER_YEAR;
    default:
      return amount;
  }
}

function normalizeFixedAmount(value, priceValue) {
  const numeric = toNumber(value);
  if (numeric == null) {
    return null;
  }
  if (numeric > 10000) {
    return numeric / 100;
  }
  const priceNumeric = toNumber(priceValue);
  if (priceNumeric != null && numeric > priceNumeric * 10) {
    return numeric / 100;
  }
  return numeric;
}

function applyDepositTypeFallback(current, depositType) {
  if (current?.weeks != null || current?.months != null) {
    return current;
  }
  if (!depositType) {
    return current;
  }
  const normalizedType = String(depositType).trim().toUpperCase();
  const mapping = DEPOSIT_TYPE_DURATIONS[normalizedType];
  if (!mapping) {
    return current;
  }
  return {
    ...current,
    weeks: mapping.weeks ?? current?.weeks ?? null,
    months: mapping.months ?? current?.months ?? null,
  };
}

function normalizeDeposit(
  deposit,
  priceValue,
  rentFrequency,
  depositType
) {
  if (!deposit || typeof deposit !== 'object') {
    const base = applyDepositTypeFallback({}, depositType);
    if (base.weeks == null && base.months == null) {
      return null;
    }
    const weeks = Number.isFinite(base.weeks) ? base.weeks : null;
    const months = Number.isFinite(base.months) ? base.months : null;
    let amount = null;
    let calculatedFrom = null;
    if (weeks != null) {
      const fromWeeks = calculateWeeklyRent(priceValue, rentFrequency);
      if (fromWeeks != null) {
        amount = fromWeeks * weeks;
        calculatedFrom = 'type-weeks';
      }
    }
    if (amount == null && months != null) {
      const fromMonths = calculateMonthlyRent(priceValue, rentFrequency);
      if (fromMonths != null) {
        amount = fromMonths * months;
        calculatedFrom = 'type-months';
      }
    }
    return {
      amount: amount != null ? roundCurrency(amount) : null,
      fixed: null,
      weeks,
      months,
      currency: 'GBP',
      calculatedFrom,
    };
  }

  const current = {
    weeks: toNumber(deposit.weeks),
    months: toNumber(deposit.months),
  };

  const withFallback = applyDepositTypeFallback(current, depositType);

  const normalizedFixed = normalizeFixedAmount(
    deposit.fixed ?? deposit.amount,
    priceValue
  );
  const explicitAmount = normalizeFixedAmount(deposit.amount, priceValue);

  let amount = null;
  let calculatedFrom = null;

  if (normalizedFixed != null) {
    amount = normalizedFixed;
    calculatedFrom = 'fixed';
  }

  if (amount == null && explicitAmount != null) {
    amount = explicitAmount;
    calculatedFrom = 'amount';
  }

  if (amount == null && withFallback.weeks != null) {
    const weekly = calculateWeeklyRent(priceValue, rentFrequency);
    if (weekly != null) {
      amount = weekly * withFallback.weeks;
      calculatedFrom = withFallback !== current ? 'type-weeks' : 'weeks';
    }
  }

  if (amount == null && withFallback.months != null) {
    const monthly = calculateMonthlyRent(priceValue, rentFrequency);
    if (monthly != null) {
      amount = monthly * withFallback.months;
      calculatedFrom = withFallback !== current ? 'type-months' : 'months';
    }
  }

  const roundedAmount = amount != null ? roundCurrency(amount) : null;

  const weeks =
    withFallback.weeks != null && Number.isFinite(withFallback.weeks)
      ? withFallback.weeks
      : null;
  const months =
    withFallback.months != null && Number.isFinite(withFallback.months)
      ? withFallback.months
      : null;

  if (
    roundedAmount == null &&
    normalizedFixed == null &&
    weeks == null &&
    months == null
  ) {
    return null;
  }

  return {
    amount: roundedAmount,
    fixed:
      normalizedFixed != null ? roundCurrency(normalizedFixed) : roundedAmount,
    weeks,
    months,
    currency: 'GBP',
    calculatedFrom,
  };
}

function formatDurationSuffix(info) {
  if (!info) {
    return '';
  }
  if (info.weeks != null) {
    const count = info.weeks;
    const plural = Math.abs(count) === 1 ? '' : 's';
    return `${count} week${plural} rent`;
  }
  if (info.months != null) {
    const count = info.months;
    const plural = Math.abs(count) === 1 ? '' : 's';
    return `${count} month${plural} rent`;
  }
  return '';
}

function formatDepositDisplay(info, { fallback = 'Please enquire' } = {}) {
  if (!info) {
    return fallback || null;
  }

  if (info.amount === 0 && (info.weeks === 0 || info.months === 0)) {
    return 'No deposit required';
  }

  if (info.amount != null) {
    const amountLabel = formatCurrencyGBP(info.amount, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const suffix = formatDurationSuffix(info);
    return suffix ? `${amountLabel} (${suffix})` : amountLabel;
  }

  const suffix = formatDurationSuffix(info);
  if (suffix) {
    return suffix;
  }

  return fallback || null;
}

function resolveAvailabilityDate(value) {
  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Date.parse(trimmed);
    if (Number.isNaN(parsed)) {
      return null;
    }
    const date = new Date(parsed);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function formatAvailabilityDate(value, { fallback = null } = {}) {
  const date = resolveAvailabilityDate(value);
  if (!date) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    return fallback;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

module.exports = {
  calculateWeeklyRent,
  calculateMonthlyRent,
  normalizeDeposit,
  formatDepositDisplay,
  resolveAvailabilityDate,
  formatAvailabilityDate,
};
