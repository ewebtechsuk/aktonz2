const ID_CANDIDATE_KEYS = [
  'id',
  'listingId',
  'listing_id',
  'propertyId',
  'property_id',
  'reference',
  'referenceId',
  'reference_id',
  'referenceNumber',
  'reference_number',
  'fullReference',
  'full_reference',
  'externalId',
  'external_id',
  'slug',
  'slugName',
  'slug_name',
];

function normalizeIdentifier(value) {
  if (value == null) return null;
  const str = String(value).trim();
  if (str.length === 0) {
    return null;
  }
  const lower = str.toLowerCase();
  if (lower === 'null' || lower === 'undefined' || lower === 'nan') {
    return null;
  }
  return str;

}

function normalizeForComparison(value) {
  const normalized = normalizeIdentifier(value);
  return normalized ? normalized.toLowerCase() : null;
}

export function resolvePropertyIdentifier(property) {
  if (!property || typeof property !== 'object') return null;

  for (const key of ID_CANDIDATE_KEYS) {
    const candidate = normalizeIdentifier(property[key]);
    if (candidate) return candidate;
  }

  const prefix =
    normalizeIdentifier(property.referencePrefix) ||
    normalizeIdentifier(property.reference_prefix);
  const number =
    normalizeIdentifier(property.referenceNumber) ||
    normalizeIdentifier(property.reference_number);
  if (number) {
    return prefix ? `${prefix}-${number}` : number;
  }

  const branchCode =
    normalizeIdentifier(property.branch?.code) ||
    normalizeIdentifier(property.branch?.id) ||
    normalizeIdentifier(property.branchId) ||
    normalizeIdentifier(property.branch_id);
  const reference =
    normalizeIdentifier(property.reference) ||
    normalizeIdentifier(property.fullReference) ||
    normalizeIdentifier(property.full_reference);
  if (branchCode && reference) {
    return `${branchCode}-${reference}`;
  }

  return null;
}

export function propertyMatchesIdentifier(property, identifier) {
  if (!property || typeof property !== 'object') return false;
  const target = normalizeForComparison(identifier);
  if (!target) return false;

  for (const key of ID_CANDIDATE_KEYS) {
    const candidate = normalizeForComparison(property[key]);
    if (candidate && candidate === target) {
      return true;
    }
  }

  const prefix =
    normalizeIdentifier(property.referencePrefix) ||
    normalizeIdentifier(property.reference_prefix);
  const number =
    normalizeIdentifier(property.referenceNumber) ||
    normalizeIdentifier(property.reference_number);
  if (number) {
    const combined = prefix ? `${prefix}-${number}` : number;
    if (normalizeForComparison(combined) === target) {
      return true;
    }
  }

  const branchCode =
    normalizeIdentifier(property.branch?.code) ||
    normalizeIdentifier(property.branch?.id) ||
    normalizeIdentifier(property.branchId) ||
    normalizeIdentifier(property.branch_id);
  const reference =
    normalizeIdentifier(property.reference) ||
    normalizeIdentifier(property.fullReference) ||
    normalizeIdentifier(property.full_reference);
  if (branchCode && reference) {
    const combined = `${branchCode}-${reference}`;
    if (normalizeForComparison(combined) === target) {
      return true;
    }
  }

  return false;
}

export function normalizePropertyIdentifier(identifier) {
  return normalizeIdentifier(identifier);
}

export function normalizePropertyIdentifierForComparison(identifier) {
  return normalizeForComparison(identifier);
}
