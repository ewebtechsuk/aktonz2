export function groupPropertyFeatures(rawFeatures) {
  const collected = [];

  const addFeature = (value) => {
    if (value == null) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(addFeature);
      return;
    }

    if (typeof value === 'number') {
      if (Number.isFinite(value)) {
        collected.push(String(value));
      }
      return;
    }

    if (typeof value === 'boolean') {
      if (value) {
        collected.push('Yes');
      }
      return;
    }

    if (typeof value === 'string') {
      const normalized = value.trim();
      if (!normalized) {
        return;
      }

      const tokens = normalized
        .split(/[\r\n,;•]+/)
        .map((token) => token.trim())
        .filter(Boolean);

      if (tokens.length === 0) {
        collected.push(normalized);
        return;
      }

      tokens.forEach((token) => {
        if (token) {
          collected.push(token);
        }
      });
      return;
    }

    if (typeof value === 'object') {
      const fields = [
        value.label,
        value.name,
        value.title,
        value.heading,
        value.text,
        value.description,
        value.value,
      ];
      fields.forEach(addFeature);
    }
  };

  addFeature(rawFeatures);

  const seen = new Set();
  const deduped = [];

  for (const feature of collected) {
    const dedupeKey = feature.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    deduped.push(feature);
  }

  return deduped;
}
