import { getProxyAgent } from './proxy-agent.js';

const DEFAULT_API_BASE = 'https://api.apex27.co.uk';
const API_BASE = process.env.APEX27_API_BASE || DEFAULT_API_BASE;
const PORTAL_BASE = process.env.APEX27_PORTAL_BASE || API_BASE;
const API_KEY = process.env.APEX27_API_KEY || process.env.NEXT_PUBLIC_APEX27_API_KEY || null;
const BRANCH_ID = process.env.APEX27_BRANCH_ID || process.env.NEXT_PUBLIC_APEX27_BRANCH_ID || null;

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
  if (!payload) return null;
  if (payload.contact) return payload.contact;
  if (payload.data && typeof payload.data === 'object') {
    if (Array.isArray(payload.data)) {
      return payload.data[0] || null;
    }
    if (payload.data.contact) {
      return payload.data.contact;
    }
    return payload.data;
  }
  if (Array.isArray(payload.contacts)) {
    return payload.contacts[0] || null;
  }
  if (Array.isArray(payload.results)) {
    return payload.results[0] || null;
  }
  return payload;
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

  if (preferred?.data) {
    return preferred.data;
  }

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

  if (fallback?.data) {
    return fallback.data;
  }

  const message = preferred?.error || fallback?.error || 'Registration failed';
  throw new Error(message);
}

export async function loginPortalAccount({ email, password }) {
  const payload = { email, password };
  if (BRANCH_ID) {
    payload.branchId = BRANCH_ID;
  }

  const result = await fetchFromCandidates(
    ['/client-portal/login', '/contact-portal/login'],
    { method: 'POST', body: payload }
  );

  if (result?.data) {
    return result.data;
  }

  const fallback = await fetchFromCandidates(
    [`/contacts?email=${encodeURIComponent(email)}`],
    { method: 'GET', base: API_BASE }
  );

  if (fallback?.data) {
    const contact = normaliseContact(fallback.data);
    if (contact) {
      return { contact };
    }
  }

  const message = result?.error || fallback?.error || 'Login failed';
  throw new Error(message);
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

