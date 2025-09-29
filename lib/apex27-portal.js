import { getProxyAgent } from './proxy-agent.js';


const DEFAULT_API_BASE = 'https://api.apex27.co.uk';
const API_BASE = process.env.APEX27_API_BASE || DEFAULT_API_BASE;
const PORTAL_BASE = process.env.APEX27_PORTAL_BASE || API_BASE;
const API_KEY = process.env.APEX27_API_KEY || process.env.NEXT_PUBLIC_APEX27_API_KEY || null;
const BRANCH_ID = process.env.APEX27_BRANCH_ID || process.env.NEXT_PUBLIC_APEX27_BRANCH_ID || null;

const CONTACT_ID_KEYS = [
  'contactId',
  'contactID',
  'contact_id',
  'contactid',
  'ContactID',
  'ContactId',
  'Contactid',
  'contactRef',
  'contactRefNo',
  'contactRefNumber',
  'contactReference',
  'contact_reference',
  'contactNumber',
  'contact_number',
  'contactNo',
  'contact_no',
  'portalContactId',
  'portalContactID',
  'portal_contact_id',
];

const CONTACT_DETAIL_KEYS = [
  'firstName',
  'surname',
  'lastName',
  'email',
  'mobilePhone',
  'homePhone',
  'workPhone',
  'address',
  'postcode',
  'title',
];

const EMAIL_KEYS = [
  'email',
  'Email',
  'userEmail',
  'user_email',
  'username',
  'userName',
  'contactEmail',
  'contact_email',
];

const PHONE_KEYS = [
  'phone',
  'phoneNumber',
  'phone_number',
  'telephone',
  'Telephone',
  'tel',
  'Tel',
  'mobile',
  'mobilePhone',
  'mobile_phone',
  'mobileNumber',
  'mobile_number',
  'mobilephone',
  'landline',
  'Landline',
  'homePhone',
  'home_phone',
  'workPhone',
  'work_phone',
];

const TOKEN_KEYS = [
  'token',
  'Token',
  'accessToken',
  'access_token',
  'authToken',
  'auth_token',
  'jwt',
  'JWT',
  'portalToken',
  'portal_token',
];

function valueLooksLikeContact(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return CONTACT_DETAIL_KEYS.some((key) => {
    const candidate = value[key];
    return candidate != null && candidate !== '';
  });
}

function scoreContact(value) {
  if (!value || typeof value !== 'object') {
    return 0;
  }

  let score = 0;

  if (readDirectContactId(value) != null) {
    score += 1;
  }

  for (const key of CONTACT_DETAIL_KEYS) {
    if (value[key] != null && value[key] !== '') {
      score += 1;
    }
  }

  return score;
}

function pickBetterContact(current, candidate) {
  if (!candidate) {
    return current || null;
  }

  if (!current) {
    return candidate;
  }

  const currentScore = scoreContact(current);
  const candidateScore = scoreContact(candidate);

  if (candidateScore > currentScore) {
    return candidate;
  }

  return current;
}

function readDirectContactId(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  for (const key of CONTACT_ID_KEYS) {
    if (value[key] != null && value[key] !== '') {
      return value[key];
    }
  }

  if ('id' in value || 'Id' in value || 'ID' in value) {
    if (valueLooksLikeContact(value)) {
      return value.id ?? value.Id ?? value.ID;
    }
  }

  return null;
}

function extractContactId(source) {
  if (!source) {
    return null;
  }

  const stack = [source];
  const seen = new WeakSet();

  while (stack.length) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    if (typeof current !== 'object') {
      continue;
    }

    if (seen.has(current)) {
      continue;
    }
    seen.add(current);

    if (Array.isArray(current)) {
      for (const entry of current) {
        stack.push(entry);
      }
      continue;
    }

    const direct = readDirectContactId(current);
    if (direct != null) {
      return direct;
    }

    for (const [key, value] of Object.entries(current)) {
      if (value == null) {
        continue;
      }

      if (typeof value !== 'object') {
        const lowerKey = key.toLowerCase();
        if (value !== '' && (lowerKey.includes('contactid') || lowerKey === 'contact' || lowerKey === 'contactid')) {
          return value;
        }
        if (value !== '' && lowerKey === 'id' && valueLooksLikeContact(current)) {
          return value;
        }
        continue;
      }

      stack.push(value);
    }
  }

  return null;
}

function extractEmail(source) {
  if (!source) {
    return null;
  }

  const stack = [source];
  const seen = new WeakSet();

  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') {
      continue;
    }

    if (seen.has(current)) {
      continue;
    }
    seen.add(current);

    if (Array.isArray(current)) {
      for (const entry of current) {
        stack.push(entry);
      }
      continue;
    }

    for (const key of EMAIL_KEYS) {
      if (current[key] != null && current[key] !== '') {
        return current[key];
      }
    }

    for (const value of Object.values(current)) {
      if (value && typeof value === 'object') {
        stack.push(value);
      }
    }
  }

  return null;
}

function extractToken(source) {
  if (!source) {
    return null;
  }

  const stack = [source];
  const seen = new WeakSet();

  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') {
      continue;
    }

    if (seen.has(current)) {
      continue;
    }
    seen.add(current);

    if (Array.isArray(current)) {
      for (const entry of current) {
        stack.push(entry);
      }
      continue;
    }

    for (const key of TOKEN_KEYS) {
      if (current[key] != null && current[key] !== '') {
        return current[key];
      }
    }

    for (const value of Object.values(current)) {
      if (value && typeof value === 'object') {
        stack.push(value);
      }
    }
  }

  return null;
}


export function normalizePhone(input) {
  if (input == null) {
    return null;
  }

  const trimmed = String(input).trim();
  if (!trimmed) {
    return null;
  }

  const withoutExtension = trimmed.replace(/(?:ext\.?|extension|x)\s*\d+$/i, '');
  let cleaned = withoutExtension.replace(/[^0-9+]/g, '');

  if (!cleaned) {
    return null;
  }

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.replace(/(?!^)\+/g, '');
    cleaned = cleaned.slice(1);
    if (cleaned.startsWith('44')) {
      cleaned = cleaned.slice(2);
      if (!cleaned.startsWith('0')) {
        cleaned = `0${cleaned}`;
      }
    }
  } else if (cleaned.startsWith('0044')) {
    cleaned = cleaned.slice(4);
    if (!cleaned.startsWith('0')) {
      cleaned = `0${cleaned}`;
    }
  }

  if (cleaned.startsWith('44') && cleaned.length > 10) {
    cleaned = cleaned.slice(2);
    if (!cleaned.startsWith('0')) {
      cleaned = `0${cleaned}`;
    }
  }

  cleaned = cleaned.replace(/\D/g, '');

  if (!cleaned) {
    return null;
  }

  if (cleaned.startsWith('0')) {
    cleaned = cleaned.replace(/^0+/, '0');
  }

  return cleaned;
}

function buildHeaders({ includeApiKey = true, token } = {}) {
  const headers = {
    accept: 'application/json',
  };

  if (includeApiKey && API_KEY) {
    headers['x-api-key'] = API_KEY;
  }

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  return headers;
}

async function fetchFromCandidates(endpoints, { method = 'GET', body, token, includeApiKey = true, base = PORTAL_BASE } = {}) {
  const errors = [];

  for (const endpoint of endpoints) {
    const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint}`;
    const headers = buildHeaders({ includeApiKey, token });
    const options = { method, headers };
    const dispatcher = getProxyAgent();
    if (dispatcher) {
      options.dispatcher = dispatcher;
    }

    if (body && method !== 'GET' && method !== 'HEAD') {
      headers['content-type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    let response;
    try {
      response = await fetch(url, options);
    } catch (err) {
      errors.push({ url, message: err instanceof Error ? err.message : String(err) });
      continue;
    }

    if (response.ok) {
      let data = null;
      try {
        data = await response.json();
      } catch (err) {
        data = null;
      }
      return { response, data, url };
    }

    if (response.status === 404 || response.status === 405) {
      continue;
    }

    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const bodyText = await response.text();
      if (bodyText) {
        try {
          const parsed = JSON.parse(bodyText);
          errorMessage = parsed?.error || parsed?.message || bodyText;
        } catch (err) {
          errorMessage = bodyText;
        }
      }
    } catch (err) {
      // Ignore body parsing errors.
    }

    return { response, error: errorMessage, url };
  }

  return { error: 'No Apex27 endpoint accepted the request', errors };
}

function normaliseContact(payload) {
  if (!payload) {
    return null;
  }

  const stack = [payload];
  const seen = new WeakSet();

  while (stack.length) {
    const current = stack.pop();

    if (!current) {
      continue;
    }

    if (typeof current !== 'object') {
      continue;
    }

    if (seen.has(current)) {
      continue;
    }
    seen.add(current);

    if (Array.isArray(current)) {
      for (const entry of current) {
        stack.push(entry);
      }
      continue;
    }

    if (valueLooksLikeContact(current) || readDirectContactId(current) != null) {
      return current;
    }

    for (const value of Object.values(current)) {
      if (value && typeof value === 'object') {
        stack.push(value);
      }
    }
  }

  return null;
}

function extractPhone(source) {
  if (!source) {
    return null;
  }

  const stack = [source];
  const seen = new WeakSet();

  while (stack.length) {
    const current = stack.pop();

    if (!current || typeof current !== 'object') {
      continue;
    }

    if (seen.has(current)) {
      continue;
    }
    seen.add(current);

    if (Array.isArray(current)) {
      for (const entry of current) {
        stack.push(entry);
      }
      continue;
    }

    for (const key of PHONE_KEYS) {
      if (current[key] != null && current[key] !== '') {
        const normalised = normalizePhone(current[key]);
        if (normalised) {
          return normalised;
        }
      }
    }

    for (const value of Object.values(current)) {
      if (value && typeof value === 'object') {
        stack.push(value);
      }
    }
  }

  return null;
}

function parsePortalAuthPayload(payload, defaults = {}) {
  const contact = normaliseContact(payload);
  const contactId = extractContactId(contact || payload) ?? null;
  const token = extractToken(payload) ?? null;
  const email = extractEmail(contact || payload) ?? defaults.email ?? null;

  return {
    raw: payload ?? null,
    contact: contact ? { ...contact } : contactId ? { contactId } : null,
    contactId,
    token,
    email,
  };
}

function mergePortalAuthResults(...results) {
  return results.reduce(
    (acc, result) => {
      if (!result) {
        return acc;
      }

      acc.raw = acc.raw ?? result.raw ?? null;
      acc.contactId = acc.contactId ?? result.contactId ?? null;
      acc.contact = pickBetterContact(acc.contact, result.contact);
      acc.token = acc.token ?? result.token ?? null;
      acc.email = acc.email ?? result.email ?? null;

      return acc;
    },
    { raw: null, contact: null, contactId: null, token: null, email: null }
  );
}

async function fetchContactByEmail(email) {
  if (!email) {
    return null;
  }

  const result = await fetchFromCandidates([
    `/contacts?email=${encodeURIComponent(email)}`,
    `/contacts?Email=${encodeURIComponent(email)}`,
  ], {
    method: 'GET',
    base: API_BASE,
  });

  if (result?.data) {
    return normaliseContact(result.data);
  }

  return null;
}

async function fetchContactByPhone(phone) {
  const canonical = normalizePhone(phone);
  if (!canonical) {
    return null;
  }

  const variants = new Set([canonical]);

  if (canonical.startsWith('0') && canonical.length > 1) {
    const withoutZero = canonical.slice(1);
    if (withoutZero) {
      variants.add(withoutZero);
      variants.add(`44${withoutZero}`);
      variants.add(`+44${withoutZero}`);
      variants.add(`0044${withoutZero}`);
    }
  } else if (canonical.startsWith('44') && canonical.length > 2) {
    const withoutCode = canonical.slice(2);
    if (withoutCode) {
      variants.add(`0${withoutCode}`);
      variants.add(withoutCode);
    }
  }

  const fields = ['phone', 'mobile', 'mobilePhone', 'landline'];
  const endpointSet = new Set();

  for (const field of fields) {
    for (const value of variants) {
      endpointSet.add(`/contacts?${encodeURIComponent(field)}=${encodeURIComponent(value)}`);
    }
  }

  const endpoints = Array.from(endpointSet);


  const result = await fetchFromCandidates(endpoints, {
    method: 'GET',
    base: API_BASE,
  });

  if (result?.data) {
    return normaliseContact(result.data);
  }

  return null;
}

export async function resolvePortalContact({ contact, contactId, token, email, phone } = {}) {

  let resolvedContact = contact ? normaliseContact(contact) : null;
  let resolvedContactId = extractContactId(resolvedContact) ?? contactId ?? null;
  let resolvedEmail = extractEmail(resolvedContact) ?? email ?? null;
  let resolvedPhone = extractPhone(resolvedContact) ?? normalizePhone(phone) ?? null;

  if (
    resolvedContact &&
    (valueLooksLikeContact(resolvedContact) ||
      resolvedEmail ||
      resolvedContactId != null ||
      resolvedPhone)
  ) {
    return {
      contact: resolvedContact,
      contactId: resolvedContactId ?? extractContactId(resolvedContact) ?? null,
      email: resolvedEmail ?? extractEmail(resolvedContact) ?? null,
      phone: resolvedPhone ?? extractPhone(resolvedContact) ?? null,
    };
  }

  if (token || resolvedContactId != null) {
    try {
      const profile = await fetchPortalProfile({ token: token || null, contactId: resolvedContactId ?? contactId ?? null });
      if (profile) {
        resolvedContact = profile;
        resolvedContactId = extractContactId(profile) ?? resolvedContactId ?? contactId ?? null;
        resolvedEmail = extractEmail(profile) ?? resolvedEmail ?? email ?? null;
        resolvedPhone = extractPhone(profile) ?? resolvedPhone ?? normalizePhone(phone) ?? null;

        if (
          resolvedContact &&
          (valueLooksLikeContact(resolvedContact) ||
            resolvedEmail ||
            resolvedContactId != null ||
            resolvedPhone)
        ) {
          return {
            contact: resolvedContact,
            contactId: resolvedContactId,
            email: resolvedEmail,
            phone: resolvedPhone ?? extractPhone(resolvedContact) ?? null,
          };
        }
      }
    } catch (err) {
      console.warn('Failed to load Apex27 profile while resolving contact', err);
    }
  }

  if (resolvedEmail || email) {
    try {
      const lookup = await fetchContactByEmail(resolvedEmail || email || null);
      if (lookup) {
        const id = extractContactId(lookup) ?? resolvedContactId ?? contactId ?? null;
        const contactEmail = extractEmail(lookup) ?? resolvedEmail ?? email ?? null;
        const contactPhone = extractPhone(lookup) ?? resolvedPhone ?? normalizePhone(phone) ?? null;
        return { contact: lookup, contactId: id, email: contactEmail, phone: contactPhone };
      }
    } catch (err) {
      console.warn('Failed to lookup Apex27 contact by email', err);
    }
  }

  if (!resolvedContactId && !(resolvedEmail || email) && (resolvedPhone || phone)) {
    try {
      const lookup = await fetchContactByPhone(resolvedPhone || phone || null);
      if (lookup) {
        const id = extractContactId(lookup) ?? resolvedContactId ?? contactId ?? null;
        const contactEmail = extractEmail(lookup) ?? resolvedEmail ?? email ?? null;
        const contactPhone = extractPhone(lookup) ?? resolvedPhone ?? normalizePhone(phone) ?? null;
        return { contact: lookup, contactId: id, email: contactEmail, phone: contactPhone };
      }
    } catch (err) {
      console.warn('Failed to lookup Apex27 contact by phone', err);
    }
  }

  if (!resolvedContact && resolvedContactId != null) {
    resolvedContact = { contactId: resolvedContactId };
  }

  return {
    contact: resolvedContact || null,
    contactId: resolvedContactId ?? null,
    email: resolvedEmail ?? email ?? null,
    phone: resolvedPhone ?? normalizePhone(phone) ?? null,
  };

}

function normaliseCollection(data) {
  if (!data) {
    return [];
  }

  if (Array.isArray(data)) {
    return data;
  }

  if (typeof data === 'object') {
    if (Array.isArray(data.results)) {
      return data.results;
    }
    if (Array.isArray(data.items)) {
      return data.items;
    }
    if (Array.isArray(data.data)) {
      return data.data;
    }
  }

  return [];
}

export async function loadContactContext({ contactId } = {}) {
  if (!contactId) {
    throw new Error('Contact ID is required');
  }

  const encodedId = encodeURIComponent(contactId);

  const [propertiesResult, viewingsResult, appointmentsResult, financialResult] = await Promise.all([
    fetchFromCandidates(
      [`/contacts/${encodedId}/properties`, `/contacts/${encodedId}/Properties`],
      { method: 'GET', base: API_BASE }
    ),
    fetchFromCandidates(
      [`/contacts/${encodedId}/viewings`, `/contacts/${encodedId}/Viewings`],
      { method: 'GET', base: API_BASE }
    ),
    fetchFromCandidates(
      [`/contacts/${encodedId}/appointments`, `/contacts/${encodedId}/Appointments`],
      { method: 'GET', base: API_BASE }
    ),
    fetchFromCandidates(
      [`/contacts/${encodedId}/financial`, `/contacts/${encodedId}/financials`, `/contacts/${encodedId}/Financials`],
      { method: 'GET', base: API_BASE }
    ),
  ]);

  const properties = normaliseCollection(propertiesResult?.data);
  const viewings = normaliseCollection(viewingsResult?.data);
  const appointments = normaliseCollection(appointmentsResult?.data);
  const financial = normaliseCollection(financialResult?.data);

  if (propertiesResult?.error) {
    console.warn('Failed to load Apex27 contact properties', propertiesResult.error);
  }
  if (viewingsResult?.error) {
    console.warn('Failed to load Apex27 contact viewings', viewingsResult.error);
  }
  if (appointmentsResult?.error) {
    console.warn('Failed to load Apex27 contact appointments', appointmentsResult.error);
  }
  if (financialResult?.error) {
    console.warn('Failed to load Apex27 contact financial records', financialResult.error);
  }

  return {
    contactId,
    properties,
    viewings,
    appointments,
    financial,
  };
}

function cleanProfileInput(input = {}) {
  const body = {};
  const fields = [
    'title',
    'firstName',
    'surname',
    'postcode',
    'address',
    'mobilePhone',
    'homePhone',
    'workPhone',
    'email',
  ];

  for (const field of fields) {
    if (input[field] != null && input[field] !== '') {
      body[field] = input[field];
    }
  }

  if (BRANCH_ID && !body.branchId) {
    body.branchId = BRANCH_ID;
  }

  return body;
}

export async function registerPortalAccount({ email, password }) {
  const payload = { email, password };
  if (BRANCH_ID) {
    payload.branchId = BRANCH_ID;
  }

  const preferred = await fetchFromCandidates(
    ['/client-portal/register', '/contact-portal/register'],
    { method: 'POST', body: payload }
  );

  const preferredResult = parsePortalAuthPayload(preferred?.data, { email });


  const fallbackPayload = { email };
  if (password) {
    fallbackPayload.password = password;
  }
  if (BRANCH_ID) {
    fallbackPayload.branchId = BRANCH_ID;
  }

  const fallback = await fetchFromCandidates(['/contacts'], {
    method: 'POST',
    body: fallbackPayload,
    base: API_BASE,
  });

  const fallbackResult = parsePortalAuthPayload(fallback?.data, { email });

  const merged = mergePortalAuthResults(preferredResult, fallbackResult);

  if (!merged.contactId && !merged.contact) {
    const message = preferred?.error || fallback?.error || 'Registration failed';
    throw new Error(message);
  }

  if (!merged.email) {
    merged.email = email ?? null;
  }

  return merged;

}

export async function loginPortalAccount({ email, password }) {
  const payload = { email, password };
  if (BRANCH_ID) {
    payload.branchId = BRANCH_ID;
  }

  const primary = await fetchFromCandidates(

    ['/client-portal/login', '/contact-portal/login'],
    { method: 'POST', body: payload }
  );

  const primaryResult = parsePortalAuthPayload(primary?.data, { email });

  let fallbackResult = null;
  let fallbackError = null;

  if (!primaryResult.contactId || !primaryResult.contact) {
    const fallback = await fetchFromCandidates(
      [`/contacts?email=${encodeURIComponent(email)}`],
      { method: 'GET', base: API_BASE }
    );

    fallbackResult = parsePortalAuthPayload(fallback?.data, { email });
    fallbackError = fallback?.error || null;
  }

  const merged = mergePortalAuthResults(primaryResult, fallbackResult);

  if (!merged.contactId && !merged.contact) {
    const message = primary?.error || fallbackError || 'Login failed';
    throw new Error(message);
  }

  if (!merged.email) {
    merged.email = email ?? null;
  }

  return merged;

}

export async function fetchPortalProfile({ token, contactId }) {
  if (token) {
    const result = await fetchFromCandidates(
      ['/client-portal/me', '/contact-portal/me'],
      { method: 'GET', token }
    );
    if (result?.data) {
      const contact = normaliseContact(result.data);
      if (contact) {
        return contact;
      }
    }
  }

  if (contactId) {
    const result = await fetchFromCandidates(
      [`/contacts/${encodeURIComponent(contactId)}`],
      { method: 'GET', base: API_BASE }
    );
    if (result?.data) {
      const contact = normaliseContact(result.data);
      if (contact) {
        return contact;
      }
    }
  }

  throw new Error('Failed to load contact details');
}

export async function updatePortalProfile({ token, contactId, input }) {
  const body = cleanProfileInput(input);

  if (!Object.keys(body).length) {
    throw new Error('No profile fields provided');
  }

  if (token) {
    const result = await fetchFromCandidates(
      ['/client-portal/me', '/contact-portal/me'],
      { method: 'PUT', body, token }
    );
    if (result?.data) {
      return normaliseContact(result.data) || result.data;
    }
    if (result?.response && result.response.ok) {
      return null;
    }
  }

  if (contactId) {
    const result = await fetchFromCandidates(
      [`/contacts/${encodeURIComponent(contactId)}`],
      { method: 'PUT', body, base: API_BASE }
    );
    if (result?.data) {
      return normaliseContact(result.data) || result.data;
    }
  }

  throw new Error('Failed to update profile');
}

