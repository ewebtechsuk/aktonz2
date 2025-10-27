export function normalizeAgentString(value) {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

export function pickFirstAgentString(...values) {
  for (const value of values) {
    const normalized = normalizeAgentString(value);
    if (normalized) {
      return normalized;
    }
  }
  return null;
}

export function normalizeAgentTestimonialEntry(entry) {
  if (!entry) {
    return null;
  }

  if (typeof entry === 'string') {
    const quote = normalizeAgentString(entry);
    return quote ? { quote, attribution: null, role: null } : null;
  }

  if (typeof entry !== 'object') {
    return null;
  }

  const quote =
    pickFirstAgentString(
      entry.quote,
      entry.testimonial,
      entry.text,
      entry.statement,
      entry.snippet,
      entry.review,
      entry.body,
      entry.message
    ) || null;

  if (!quote) {
    return null;
  }

  const attribution =
    pickFirstAgentString(
      entry.attribution,
      entry.source,
      entry.name,
      entry.author,
      entry.byline,
      entry.reviewer,
      entry.from
    ) || null;

  const role =
    pickFirstAgentString(
      entry.role,
      entry.title,
      entry.position,
      entry.context,
      entry.meta,
      entry.occupation
    ) || null;

  return { quote, attribution, role };
}

export function collectAgentTestimonials(...inputs) {
  const testimonials = [];

  const append = (value) => {
    if (!value) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(append);
      return;
    }

    const normalized = normalizeAgentTestimonialEntry(value);
    if (normalized) {
      testimonials.push(normalized);
    }
  };

  inputs.forEach(append);

  return testimonials;
}
