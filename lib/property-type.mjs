function normalizeFieldKey(value) {
  if (!value) return '';
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function coerceString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function humanize(value) {
  const str = coerceString(value);
  if (!str) return null;
  return str
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function extractFromFieldCollection(collection) {
  if (!Array.isArray(collection)) return null;
  for (const entry of collection) {
    if (!entry || typeof entry !== 'object') continue;
    const keyCandidates = [
      entry.field,
      entry.fieldName,
      entry.field_name,
      entry.name,
      entry.id,
      entry.key,
      entry.meta,
      entry.identifier,
    ]
      .map((value) => normalizeFieldKey(value))
      .filter(Boolean);

    if (!keyCandidates.some((key) => key.includes('propertytype'))) {
      continue;
    }

    const labelCandidates = [
      entry.fieldLabel,
      entry.field_label,
      entry.valueLabel,
      entry.value_label,
      entry.displayValue,
      entry.display_value,
      entry.displayLabel,
      entry.display_label,
      entry.label,
      entry.text,
      entry.value,
    ];

    for (const candidate of labelCandidates) {
      const str = coerceString(candidate);
      if (str) return str;
    }
  }
  return null;
}

function extractFromObjectMap(mapLike) {
  if (!mapLike || typeof mapLike !== 'object') return null;
  const direct =
    mapLike.propertyType ??
    mapLike.property_type ??
    mapLike.propertytype ??
    mapLike.type ??
    null;
  return coerceString(direct);
}

export function resolvePropertyTypeLabel(listing) {
  if (!listing || typeof listing !== 'object') {
    return null;
  }

  const directKeys = [
    'propertyTypeLabel',
    'property_type_label',
    'propertyTypeName',
    'property_type_name',
    'propertyTypeDisplay',
    'property_type_display',
    'displayPropertyType',
    'display_property_type',
    'propertyTypeText',
    'property_type_text',
  ];

  for (const key of directKeys) {
    const value = coerceString(listing[key]);
    if (value) return value;
  }

  const mapCandidates = [
    listing.fieldLabels,
    listing.field_labels,
    listing.fieldLabel,
    listing.field_label,
    listing.labels,
  ];

  for (const candidate of mapCandidates) {
    const extracted = extractFromObjectMap(candidate);
    if (extracted) return extracted;
  }

  const collections = [];
  if (Array.isArray(listing.fields)) {
    collections.push(listing.fields);
  } else if (listing.fields && typeof listing.fields === 'object') {
    collections.push(Object.values(listing.fields));
  }
  if (Array.isArray(listing.metadata)) {
    collections.push(listing.metadata);
  }
  if (Array.isArray(listing.customFields)) {
    collections.push(listing.customFields);
  }
  if (Array.isArray(listing.custom_fields)) {
    collections.push(listing.custom_fields);
  }

  for (const collection of collections) {
    const extracted = extractFromFieldCollection(collection);
    if (extracted) return extracted;
  }

  const fallback =
    listing.displayPropertyType ??
    listing.display_property_type ??
    listing.propertyType ??
    listing.property_type ??
    listing.type ??
    null;

  return humanize(fallback);
}

export function formatPropertyTypeLabel(value) {
  return humanize(value);
}
