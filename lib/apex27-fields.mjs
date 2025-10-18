function flattenInternal(value, prefix = '') {
  if (value === null || value === undefined) {
    return [{ key: prefix, value: null }];
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [{ key: prefix, value: [] }];
    }

    return value.flatMap((item, index) => {
      const nextPrefix = prefix ? `${prefix}[${index}]` : `[${index}]`;
      return flattenInternal(item, nextPrefix);
    });
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return [{ key: prefix, value: {} }];
    }

    return entries.flatMap(([key, nested]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      return flattenInternal(nested, nextPrefix);
    });
  }

  return [{ key: prefix, value }];
}

function cloneValue(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== 'object') {
    return value;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    if (Array.isArray(value)) {
      return value.map((entry) => cloneValue(entry));
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, cloneValue(nested)]),
    );
  }
}

export function flattenApexFields(value) {
  const entries = flattenInternal(value);

  return entries
    .map(({ key, value: entryValue }) => ({
      key: typeof key === 'string' ? key : '',
      value: cloneValue(entryValue),
    }))
    .filter((entry) => entry.key.length > 0)
    .sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true, sensitivity: 'base' }));
}

export function cloneApexFieldEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.map((entry) => ({
    key: typeof entry?.key === 'string' ? entry.key : '',
    value: cloneValue(entry?.value),
  }));
}
