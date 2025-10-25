function coerceTimestamp(value) {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isNaN(timestamp) ? { valid: false, timestamp: 0 } : { valid: true, timestamp };
  }

  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? { valid: true, timestamp: value }
      : { valid: false, timestamp: 0 };
  }

  if (value == null || value === '') {
    return { valid: false, timestamp: 0 };
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp)
    ? { valid: false, timestamp: 0 }
    : { valid: true, timestamp };
}

export function parseTimestamp(value) {
  return coerceTimestamp(value).timestamp;
}

export function resolveTimestamp(...values) {
  for (const value of values) {
    const { valid, timestamp } = coerceTimestamp(value);
    if (valid) {
      return timestamp;
    }
  }

  return 0;
}

export default parseTimestamp;
