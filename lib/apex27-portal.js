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

const CONTACT_NAME_KEYS = [
  'name',
  'Name',
  'fullName',
  'FullName',
  'displayName',
  'display_name',
  'contactName',
  'contact_name',
  'ContactName',
  'Contact_name',
  'contactFullName',
  'contact_full_name',
];

const FIRST_NAME_KEYS = [
  'firstName',
  'FirstName',
  'firstname',
  'first_name',
  'forename',
  'Forename',
  'givenName',
  'given_name',
  'GivenName',
];

const LAST_NAME_KEYS = [
  'surname',
  'Surname',
  'lastName',
  'LastName',
  'lastname',
  'last_name',
  'familyName',
  'family_name',
  'FamilyName',
];

const TITLE_KEYS = ['title', 'Title', 'salutation', 'Salutation'];

const BRANCH_NAME_KEYS = [
  'branch',
  'Branch',
  'branchName',
  'BranchName',
  'branch_name',
  'branchOffice',
  'BranchOffice',
  'branchLabel',
  'BranchLabel',
  'officeName',
  'OfficeName',
];

const CONTACT_TYPE_KEYS = [
  'contactType',
  'ContactType',
  'type',
  'Type',
  'category',
  'Category',
];

const CREATED_AT_KEYS = [
  'createdAt',
  'CreatedAt',
  'created_at',
  'created',
  'Created',
  'createdOn',
  'CreatedOn',
  'creationDate',
  'CreationDate',
  'dateCreated',
  'DateCreated',
  'addedAt',
  'AddedAt',
];

const UPDATED_AT_KEYS = [
  'updatedAt',
  'UpdatedAt',
  'updated_at',
  'updated',
  'Updated',
  'modifiedAt',
  'ModifiedAt',
  'modified_on',
  'modifiedOn',
  'ModifiedOn',
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

function readStringValue(value) {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();
  return text ? text : null;
}

function pickStringFromKeys(source, keys) {
  if (!source || typeof source !== 'object') {
    return null;
  }

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const candidate = readStringValue(source[key]);
      if (candidate) {
        return candidate;
      }
    }
  }

  return null;
}

function extractPhoneDisplay(source) {
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
      if (Object.prototype.hasOwnProperty.call(current, key)) {
        const candidate = readStringValue(current[key]);
        if (candidate) {
          return candidate;
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

function buildContactSummary(entry) {
  if (!entry) {
    return null;
  }

  const contact = normaliseContact(entry) || entry;
  if (!contact || typeof contact !== 'object') {
    return null;
  }

  const contactId = extractContactId(contact) ?? extractContactId(entry) ?? null;
  const email = extractEmail(contact) ?? extractEmail(entry) ?? null;
  const phoneNormalised = extractPhone(contact) ?? extractPhone(entry) ?? null;
  const phoneDisplay = extractPhoneDisplay(contact) ?? extractPhoneDisplay(entry) ?? null;

  const title = pickStringFromKeys(contact, TITLE_KEYS);
  const firstName = pickStringFromKeys(contact, FIRST_NAME_KEYS);
  const lastName = pickStringFromKeys(contact, LAST_NAME_KEYS);
  let name = [title, firstName, lastName].filter(Boolean).join(' ').trim();
  if (!name) {
    name = pickStringFromKeys(contact, CONTACT_NAME_KEYS) || pickStringFromKeys(entry, CONTACT_NAME_KEYS) || null;
  }
  if (!name && email) {
    name = email;
  }
  if (!name && phoneDisplay) {
    name = phoneDisplay;
  }
  if (!name) {
    name = 'Unnamed contact';
  }

  const branch = pickStringFromKeys(contact, BRANCH_NAME_KEYS) || pickStringFromKeys(entry, BRANCH_NAME_KEYS) || null;
  const type = pickStringFromKeys(contact, CONTACT_TYPE_KEYS) || pickStringFromKeys(entry, CONTACT_TYPE_KEYS) || null;
  const createdAt = pickStringFromKeys(contact, CREATED_AT_KEYS) || pickStringFromKeys(entry, CREATED_AT_KEYS) || null;
  const updatedAt = pickStringFromKeys(contact, UPDATED_AT_KEYS) || pickStringFromKeys(entry, UPDATED_AT_KEYS) || null;

  return {
    id: contactId ?? null,
    title: title || null,
    firstName: firstName || null,
    lastName: lastName || null,
    name,
    email: email ?? null,
    phone: phoneDisplay ?? phoneNormalised ?? null,
    phoneNormalised: phoneNormalised ?? null,
    branch: branch || null,
    type: type || null,
    createdAt: createdAt || null,
    updatedAt: updatedAt || null,
  };
}

function extractContactsCollection(payload) {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  const direct = normaliseCollection(payload);
  if (direct.length) {
    return direct;
  }

  const candidateKeys = [
    'contacts',
    'Contacts',
    'items',
    'Items',
    'results',
    'Results',
    'records',
    'Records',
    'entries',
    'Entries',
  ];

  for (const key of candidateKeys) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }

  const stack = [];
  for (const value of Object.values(payload)) {
    if (value && typeof value === 'object') {
      stack.push(value);
    }
  }

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
      if (!current.length) {
        continue;
      }
      return current;
    }

    const normalised = normaliseCollection(current);
    if (normalised.length) {
      return normalised;
    }

    for (const key of candidateKeys) {
      if (Array.isArray(current[key])) {
        return current[key];
      }
    }

    for (const value of Object.values(current)) {
      if (value && typeof value === 'object') {
        stack.push(value);
      }
    }
  }

  return [];
}

function extractNumberFromSources(sources, keys) {
  for (const source of sources) {
    if (!source || typeof source !== 'object') {
      continue;
    }

    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) {
        continue;
      }

      const value = source[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }

      if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }
  }

  return null;
}

function normaliseContactsResult(payload, { page, pageSize } = {}) {
  const collection = extractContactsCollection(payload);
  const contacts = collection.map((entry) => buildContactSummary(entry)).filter(Boolean);

  const metaSources = [];
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    metaSources.push(payload);
    if (payload.meta && typeof payload.meta === 'object') {
      metaSources.push(payload.meta);
    }
    if (payload.Meta && typeof payload.Meta === 'object') {
      metaSources.push(payload.Meta);
    }
    if (payload.pagination && typeof payload.pagination === 'object') {
      metaSources.push(payload.pagination);
    }
    if (payload.Pagination && typeof payload.Pagination === 'object') {
      metaSources.push(payload.Pagination);
    }
    if (payload.pageInfo && typeof payload.pageInfo === 'object') {
      metaSources.push(payload.pageInfo);
    }
    if (payload.PageInfo && typeof payload.PageInfo === 'object') {
      metaSources.push(payload.PageInfo);
    }
  }

  const dataObject = payload && typeof payload === 'object' ? payload.data || payload.Data || null : null;
  if (dataObject && typeof dataObject === 'object') {
    metaSources.push(dataObject);
    if (dataObject.meta && typeof dataObject.meta === 'object') {
      metaSources.push(dataObject.meta);
    }
    if (dataObject.pagination && typeof dataObject.pagination === 'object') {
      metaSources.push(dataObject.pagination);
    }
  }

  const uniqueSources = metaSources.filter((value, index, array) => array.indexOf(value) === index);

  const totalCount = extractNumberFromSources(uniqueSources, [
    'total',
    'Total',
    'totalCount',
    'TotalCount',
    'count',
    'Count',
    'totalRecords',
    'TotalRecords',
    'totalItems',
    'TotalItems',
  ]);

  const pageCount = extractNumberFromSources(uniqueSources, [
    'totalPages',
    'TotalPages',
    'pageCount',
    'PageCount',
    'pages',
    'Pages',
  ]);

  const currentPage = extractNumberFromSources(uniqueSources, [
    'page',
    'Page',
    'currentPage',
    'CurrentPage',
    'current',
    'Current',
  ]);

  const reportedPageSize = extractNumberFromSources(uniqueSources, [
    'pageSize',
    'PageSize',
    'perPage',
    'PerPage',
    'limit',
    'Limit',
  ]);

  const safePageSize =
    (Number.isFinite(reportedPageSize) && reportedPageSize > 0
      ? Math.trunc(reportedPageSize)
      : Number.isFinite(pageSize) && pageSize > 0
      ? Math.trunc(pageSize)
      : contacts.length || 25);

  let resolvedTotal = Number.isFinite(totalCount) && totalCount >= 0 ? Math.trunc(totalCount) : null;
  if (resolvedTotal == null) {
    resolvedTotal = contacts.length;
  }

  let resolvedPageCount = Number.isFinite(pageCount) && pageCount >= 0 ? Math.trunc(pageCount) : null;
  if ((resolvedPageCount == null || resolvedPageCount <= 0) && resolvedTotal != null && safePageSize > 0) {
    resolvedPageCount = Math.ceil(resolvedTotal / safePageSize);
  }
  if (resolvedPageCount == null) {
    resolvedPageCount = 0;
  }

  const resolvedPage =
    Number.isFinite(currentPage) && currentPage > 0
      ? Math.trunc(currentPage)
      : Number.isFinite(page) && page > 0
      ? Math.trunc(page)
      : contacts.length
      ? 1
      : 1;

  return {
    contacts,
    totalCount: resolvedTotal,
    pageCount: resolvedPageCount,
    page: resolvedPage,
    pageSize: safePageSize,
  };
}

function buildContactsEndpoints({ page, pageSize, name, email, phone, branchId } = {}) {
  const endpoints = new Set();
  const baseParams = [new URLSearchParams()];

  const setOnAll = (callback) => {
    for (const params of baseParams) {
      callback(params);
    }
  };

  const extendParams = (keys, values) => {
    if (!keys?.length || !values?.length) {
      return;
    }

    const snapshot = baseParams.slice();
    for (const params of snapshot) {
      for (const key of keys) {
        for (const value of values) {
          const next = new URLSearchParams(params);
          next.set(key, value);
          baseParams.push(next);
        }
      }
    }
  };

  if (Number.isFinite(page) && page > 0) {
    const pageValue = String(Math.trunc(page));
    setOnAll((params) => {
      params.set('page', pageValue);
    });
    extendParams(['Page'], [pageValue]);
  }

  if (Number.isFinite(pageSize) && pageSize > 0) {
    const sizeValue = String(Math.trunc(pageSize));
    setOnAll((params) => {
      params.set('perPage', sizeValue);
      params.set('pageSize', sizeValue);
    });
    extendParams(['limit', 'Limit', 'PageSize', 'PerPage'], [sizeValue]);
  }

  if (branchId) {
    const branchValue = String(branchId);
    extendParams(['branchId', 'branch', 'BranchID', 'BranchId'], [branchValue]);
  }

  if (name) {
    const nameValue = String(name);
    extendParams(['name', 'fullName', 'search', 'q'], [nameValue]);
  }

  if (email) {
    const emailValue = String(email);
    extendParams(['email', 'Email', 'contactEmail'], [emailValue]);
  }

  if (phone) {
    const phoneValues = new Set();
    const trimmed = readStringValue(phone);
    if (trimmed) {
      phoneValues.add(trimmed);
    }
    const normalised = normalizePhone(phone);
    if (normalised) {
      phoneValues.add(normalised);
      if (normalised.startsWith('0') && normalised.length > 1) {
        const withoutZero = normalised.slice(1);
        if (withoutZero) {
          phoneValues.add(withoutZero);
          phoneValues.add(`44${withoutZero}`);
          phoneValues.add(`+44${withoutZero}`);
          phoneValues.add(`0044${withoutZero}`);
        }
      }
      if (normalised.startsWith('44') && normalised.length > 2) {
        const withoutCode = normalised.slice(2);
        if (withoutCode) {
          phoneValues.add(`0${withoutCode}`);
          phoneValues.add(withoutCode);
        }
      }
    }

    const valueList = Array.from(phoneValues).filter(Boolean);
    if (valueList.length) {
      extendParams(['phone', 'mobilePhone', 'telephone', 'phoneNumber', 'phone_number'], valueList);
    }
  }

  const paths = ['/contacts', '/Contacts'];

  for (const params of baseParams) {
    const query = params.toString();
    for (const path of paths) {
      const endpoint = query ? `${path}?${query}` : path;
      endpoints.add(endpoint);
    }
  }

  return Array.from(endpoints);
}

async function queryContacts(options = {}, { mode = 'list' } = {}) {
  const {
    page: inputPage,
    pageSize: inputPageSize,
    limit,
    name,
    email,
    phone,
    branchId = BRANCH_ID,
  } = options || {};

  const page = Number.isFinite(inputPage) && inputPage > 0 ? Math.trunc(inputPage) : 1;
  const requestedSize =
    mode === 'search'
      ? limit ?? inputPageSize ?? options?.perPage ?? options?.size
      : inputPageSize ?? options?.perPage ?? options?.size ?? limit;
  const pageSize = Number.isFinite(requestedSize) && requestedSize > 0 ? Math.trunc(requestedSize) : mode === 'search' ? 10 : 25;

  const trimmedName = readStringValue(name);
  const trimmedEmail = readStringValue(email);
  const trimmedPhone = readStringValue(phone);

  const endpoints = buildContactsEndpoints({
    page,
    pageSize,
    name: trimmedName,
    email: trimmedEmail,
    phone: trimmedPhone,
    branchId: branchId || null,
  });

  if (!endpoints.length) {
    return {
      contacts: [],
      totalCount: 0,
      pageCount: 0,
      page,
      pageSize,
      hasNextPage: false,
      hasPreviousPage: false,
    };
  }

  const result = await fetchFromCandidates(endpoints, {
    method: 'GET',
    base: API_BASE,
  });

  if (result?.error) {
    throw new Error(result.error);
  }

  const parsed = normaliseContactsResult(result?.data ?? null, { page, pageSize });

  const contacts = Array.isArray(parsed?.contacts) ? parsed.contacts : [];
  const totalCount = Number.isFinite(parsed?.totalCount) && parsed.totalCount >= 0 ? Math.trunc(parsed.totalCount) : contacts.length;
  const resolvedPageSize = Number.isFinite(parsed?.pageSize) && parsed.pageSize > 0 ? Math.trunc(parsed.pageSize) : pageSize;
  const resolvedPage = Number.isFinite(parsed?.page) && parsed.page > 0 ? Math.trunc(parsed.page) : page;
  const pageCount = Number.isFinite(parsed?.pageCount) && parsed.pageCount >= 0 ? Math.trunc(parsed.pageCount) : 0;

  const hasNextPage = pageCount ? resolvedPage < pageCount : totalCount > resolvedPage * resolvedPageSize;
  const hasPreviousPage = resolvedPage > 1;

  return {
    contacts,
    totalCount,
    pageCount,
    page: resolvedPage,
    pageSize: resolvedPageSize,
    hasNextPage,
    hasPreviousPage,
  };
}

export async function listContacts(options = {}) {
  return queryContacts(options, { mode: 'list' });
}

export async function searchContacts(options = {}) {
  const { query, limit = 10, ...rest } = options || {};
  const filters = { ...rest };
  if (query && !filters.name && !filters.search) {
    filters.name = query;
  }
  if (!filters.page) {
    filters.page = 1;
  }
  if (!filters.pageSize && !filters.perPage && !filters.size) {
    filters.pageSize = limit;
  }

  return queryContacts(filters, { mode: 'search' });
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

