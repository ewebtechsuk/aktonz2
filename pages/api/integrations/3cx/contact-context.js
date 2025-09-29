import { applyApiHeaders, handlePreflight } from '../../../../lib/api-helpers.js';
import { resolvePortalContact, loadContactContext, lookupContactByPhone } from '../../../../lib/apex27-portal.js';
import { readSession } from '../../../../lib/session.js';
import { getAdminFromSession } from '../../../../lib/admin-users.mjs';

const CONTACT_ID_KEYS = [
  'contactId',
  'contactID',
  'contact_id',
  'contactid',
  'ContactID',
  'ContactId',
  'portalContactId',
  'portalContactID',
  'portal_contact_id',
  'contactRef',
  'contactRefNo',
  'contactRefNumber',
  'contactReference',
  'contact_reference',
  'contactNumber',
  'contact_number',
  'contactNo',
  'contact_no',
  'id',
  'Id',
  'ID',
  'reference',
  'Reference',
];

const CONTACT_NAME_FIELDS = [
  'name',
  'fullName',
  'full_name',
  'displayName',
  'display_name',
  'contactName',
  'contact_name',
];

const CONTACT_TITLE_FIELDS = ['title', 'honorific'];
const CONTACT_FIRST_NAME_FIELDS = ['firstName', 'firstname', 'first_name', 'givenName', 'given_name', 'forename'];
const CONTACT_LAST_NAME_FIELDS = ['surname', 'lastName', 'lastname', 'last_name', 'familyName', 'family_name'];
const CONTACT_STAGE_FIELDS = ['stage', 'status', 'lifecycleStage', 'lifecycle_stage', 'pipelineStage', 'pipeline_stage'];
const CONTACT_EMAIL_FIELDS = ['email', 'Email', 'emailAddress', 'email_address', 'contactEmail', 'contact_email'];
const CONTACT_PHONE_FIELDS = [
  'phone',
  'phoneNumber',
  'phone_number',
  'telephone',
  'tel',
  'Tel',
  'mobile',
  'mobilePhone',
  'mobile_phone',
  'mobileNumber',
  'mobile_number',
  'homePhone',
  'home_phone',
  'workPhone',
  'work_phone',
];
const CONTACT_AVATAR_FIELDS = ['avatarUrl', 'avatar', 'avatar_url', 'photoUrl', 'photoURL', 'photo', 'imageUrl', 'image_url'];
const CONTACT_COMPANY_FIELDS = ['company', 'companyName', 'company_name', 'organisation', 'organization', 'employer'];
const CONTACT_TAG_FIELDS = ['tags', 'Tags', 'labels', 'label', 'categories'];
const CONTACT_SEARCH_FIELDS = [
  'searchFocus',
  'search_focus',
  'requirements',
  'requirementSummary',
  'requirement_summary',
  'lookingFor',
  'looking_for',
];
const NOTE_FIELDS = ['notes', 'note', 'latestNote', 'latest_note', 'summary'];

const PROPERTY_ID_FIELDS = ['id', 'Id', 'ID', 'propertyId', 'propertyID', 'PropertyID'];
const PROPERTY_REFERENCE_FIELDS = ['reference', 'Reference', 'propertyRef', 'property_ref', 'propertyReference'];
const PROPERTY_TITLE_FIELDS = ['title', 'Title', 'name', 'Name'];
const PROPERTY_ADDRESS_FIELDS = [
  'address',
  'Address',
  'address1',
  'address2',
  'addressLine1',
  'addressLine2',
  'address_line_1',
  'address_line_2',
  'fullAddress',
  'full_address',
];
const PROPERTY_STATUS_FIELDS = ['status', 'Status', 'stage', 'Stage'];
const PROPERTY_PRICE_FIELDS = ['price', 'Price', 'priceLabel', 'price_label', 'priceText', 'price_text'];
const PROPERTY_TYPE_FIELDS = ['type', 'Type', 'category', 'Category', 'propertyType', 'property_type'];

const APPOINTMENT_ID_FIELDS = ['id', 'Id', 'ID', 'appointmentId', 'appointmentID'];
const APPOINTMENT_TYPE_FIELDS = ['type', 'Type', 'appointmentType', 'appointment_type', 'category'];
const APPOINTMENT_DATE_FIELDS = [
  'date',
  'Date',
  'start',
  'startDate',
  'start_date',
  'startTime',
  'start_time',
  'when',
  'scheduledAt',
  'scheduled_at',
];
const APPOINTMENT_SUMMARY_FIELDS = ['summary', 'Summary', 'title', 'Title', 'description', 'Description', 'notes', 'Notes'];
const AGENT_NAME_FIELDS = ['name', 'Name', 'agentName', 'agent_name'];
const PROPERTY_IN_APPOINTMENT_FIELDS = ['property', 'listing'];

function getQueryValue(value) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (entry == null) {
        continue;
      }
      const trimmed = String(entry).trim();
      if (trimmed) {
        return trimmed;
      }
    }
    return null;
  }

  if (value == null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
}

function pickFieldValue(source, candidates) {
  if (!source || typeof source !== 'object') {
    return null;
  }

  for (const key of candidates) {
    if (key in source) {
      const value = source[key];
      if (value != null && value !== '') {
        return value;
      }
    }
  }

  return null;
}

function extractContactId(contact) {
  return pickFieldValue(contact, CONTACT_ID_KEYS);
}

function normaliseName(contact) {
  const direct = pickFieldValue(contact, CONTACT_NAME_FIELDS);
  if (direct) {
    return String(direct);
  }

  const parts = [];
  const title = pickFieldValue(contact, CONTACT_TITLE_FIELDS);
  const first = pickFieldValue(contact, CONTACT_FIRST_NAME_FIELDS);
  const last = pickFieldValue(contact, CONTACT_LAST_NAME_FIELDS);

  if (title) {
    parts.push(String(title));
  }
  if (first) {
    parts.push(String(first));
  }
  if (last) {
    parts.push(String(last));
  }

  if (parts.length > 0) {
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  const company = pickFieldValue(contact, CONTACT_COMPANY_FIELDS);
  if (company) {
    return String(company);
  }

  return null;
}

function normaliseTags(contact) {
  const value = pickFieldValue(contact, CONTACT_TAG_FIELDS);
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).filter((entry) => entry.trim().length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [];
}

function normalisePreferredAgent(contact) {
  const agent = contact?.preferredAgent || contact?.preferred_agent || contact?.agent || contact?.Agent;
  if (agent && typeof agent === 'object') {
    const name = pickFieldValue(agent, AGENT_NAME_FIELDS) || agent.fullName || agent.FullName;
    if (name) {
      return { name: String(name) };
    }
  }

  const name = pickFieldValue(contact, ['preferredAgentName', 'preferred_agent_name', 'agentName', 'agent_name']);
  return name ? { name: String(name) } : null;
}

function buildContactDetails(contact, { email, phone }) {
  const name = normaliseName(contact);
  const stage = pickFieldValue(contact, CONTACT_STAGE_FIELDS);
  const resolvedEmail = email || pickFieldValue(contact, CONTACT_EMAIL_FIELDS);
  const resolvedPhone = phone || pickFieldValue(contact, CONTACT_PHONE_FIELDS);
  const avatarUrl = pickFieldValue(contact, CONTACT_AVATAR_FIELDS);
  const company = pickFieldValue(contact, CONTACT_COMPANY_FIELDS);
  const preferredAgent = normalisePreferredAgent(contact);
  const tags = normaliseTags(contact);
  const searchFocus = pickFieldValue(contact, CONTACT_SEARCH_FIELDS);

  const details = {
    name: name || null,
    stage: stage ? String(stage) : null,
    email: resolvedEmail ? String(resolvedEmail) : null,
    phone: resolvedPhone ? String(resolvedPhone) : null,
    avatarUrl: avatarUrl ? String(avatarUrl) : null,
    company: company ? String(company) : null,
    preferredAgent,
    tags,
    searchFocus: searchFocus ? String(searchFocus) : null,
  };

  return Object.fromEntries(
    Object.entries(details).filter(([, value]) => value != null && value !== '' && (!Array.isArray(value) || value.length > 0))
  );
}

function buildAddress(property) {
  if (!property || typeof property !== 'object') {
    return null;
  }

  if (typeof property.address === 'string' && property.address.trim()) {
    return property.address.trim();
  }

  const parts = [];
  for (const key of PROPERTY_ADDRESS_FIELDS) {
    const value = property[key];
    if (typeof value === 'string' && value.trim()) {
      parts.push(value.trim());
    }
  }

  if (parts.length === 0) {
    return null;
  }

  return Array.from(new Set(parts)).join(', ');
}

function normaliseProperty(property) {
  if (!property || typeof property !== 'object') {
    return null;
  }

  const id = pickFieldValue(property, PROPERTY_ID_FIELDS);
  const reference = pickFieldValue(property, PROPERTY_REFERENCE_FIELDS);
  const title = pickFieldValue(property, PROPERTY_TITLE_FIELDS);
  const address = buildAddress(property);
  const status = pickFieldValue(property, PROPERTY_STATUS_FIELDS);
  const priceValue = pickFieldValue(property, PROPERTY_PRICE_FIELDS);
  const type = pickFieldValue(property, PROPERTY_TYPE_FIELDS);

  const price =
    typeof priceValue === 'number'
      ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(priceValue)
      : priceValue;

  const normalised = {
    id: id ? String(id) : undefined,
    reference: reference ? String(reference) : undefined,
    title: title ? String(title) : undefined,
    address: address ? String(address) : undefined,
    status: status ? String(status) : undefined,
    price: price ? String(price) : undefined,
    type: type ? String(type) : undefined,
  };

  const meaningful = Object.values(normalised).some((value) => value != null && value !== '');
  return meaningful ? normalised : null;
}

function normaliseProperties(properties) {
  if (!Array.isArray(properties)) {
    return [];
  }

  return properties
    .map((property) => normaliseProperty(property))
    .filter((entry) => entry != null);
}

function normaliseAppointmentProperty(source) {
  if (!source || typeof source !== 'object') {
    return null;
  }

  const id = pickFieldValue(source, PROPERTY_ID_FIELDS);
  const title = pickFieldValue(source, [...PROPERTY_TITLE_FIELDS, 'address', 'Address']);
  const address = buildAddress(source);

  const result = {
    id: id ? String(id) : undefined,
    title: title ? String(title) : undefined,
    address: address ? String(address) : undefined,
  };

  const meaningful = Object.values(result).some((value) => value != null && value !== '');
  return meaningful ? result : null;
}

function normaliseAgent(source) {
  if (!source || typeof source !== 'object') {
    return null;
  }

  const name = pickFieldValue(source, AGENT_NAME_FIELDS) || source.fullName || source.FullName;
  return name ? { name: String(name) } : null;
}

function normaliseAppointment(appointment) {
  if (!appointment || typeof appointment !== 'object') {
    return null;
  }

  const id = pickFieldValue(appointment, APPOINTMENT_ID_FIELDS);
  const type = pickFieldValue(appointment, APPOINTMENT_TYPE_FIELDS) || appointment.kind || appointment.eventType;
  const date = pickFieldValue(appointment, APPOINTMENT_DATE_FIELDS);
  const summary = pickFieldValue(appointment, APPOINTMENT_SUMMARY_FIELDS);

  let agent = null;
  if (appointment.agent && typeof appointment.agent === 'object') {
    agent = normaliseAgent(appointment.agent);
  }
  if (!agent) {
    agent = normaliseAgent(appointment);
  }

  let property = null;
  for (const key of PROPERTY_IN_APPOINTMENT_FIELDS) {
    if (appointment[key]) {
      property = normaliseAppointmentProperty(appointment[key]);
      if (property) {
        break;
      }
    }
  }

  const result = {
    id: id ? String(id) : undefined,
    type: type ? String(type) : undefined,
    date: date ? String(date) : undefined,
    summary: summary ? String(summary) : undefined,
    agent,
    property,
  };

  const meaningful = Object.values(result).some((value) => {
    if (value == null || value === '') {
      return false;
    }
    if (typeof value === 'object') {
      return Object.values(value).some((nested) => nested != null && nested !== '');
    }
    return true;
  });

  return meaningful ? result : null;
}

function normaliseAppointments(...groups) {
  const entries = [];
  for (const group of groups) {
    if (!Array.isArray(group)) {
      continue;
    }
    for (const appointment of group) {
      const normalised = normaliseAppointment(appointment);
      if (normalised) {
        entries.push(normalised);
      }
    }
  }
  return entries;
}

function buildFinancialSummary(records) {
  if (!records) {
    return null;
  }

  const summary = {};

  const visit = (collection) => {
    for (const record of collection) {
      if (!record || typeof record !== 'object') {
        continue;
      }

      if (record.label && record.value != null && record.value !== '') {
        summary[String(record.label)] = String(record.value);
        continue;
      }

      for (const [key, value] of Object.entries(record)) {
        if (value == null || value === '' || typeof value === 'object') {
          continue;
        }
        summary[String(key)] = String(value);
      }
    }
  };

  if (Array.isArray(records)) {
    visit(records);
  } else if (typeof records === 'object') {
    visit([records]);
  }

  return Object.keys(summary).length > 0 ? summary : null;
}

function extractNotes(contactContext, contact) {
  const noteFromContext = pickFieldValue(contactContext, NOTE_FIELDS);
  if (noteFromContext) {
    return String(noteFromContext);
  }

  const noteFromContact = pickFieldValue(contact, NOTE_FIELDS);
  return noteFromContact ? String(noteFromContact) : null;
}

function requireAdmin(req, res) {
  const session = readSession(req);
  const admin = getAdminFromSession(session);

  if (!admin) {
    res.status(401).json({ error: 'Admin authentication required' });
    return null;
  }

  return admin;
}

export default async function handler(req, res) {
  applyApiHeaders(req, res, { methods: ['GET'] });

  if (handlePreflight(req, res)) {
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end('Method Not Allowed');
    return;
  }

  if (!requireAdmin(req, res)) {
    return;
  }

  const token = getQueryValue(req.query?.token);
  const phone = getQueryValue(req.query?.phone);
  const countryCode = getQueryValue(req.query?.countryCode);

  if (!token && !phone) {
    res.status(400).json({ error: 'Missing lookup token or phone number' });
    return;
  }

  let resolvedContact;
  try {
    resolvedContact = await resolvePortalContact({
      token: token ?? null,
      phone: phone ?? null,
      countryCode: countryCode ?? null,
      allowPhoneLookup: true,
    });
  } catch (error) {
    console.error('Failed to resolve Apex27 portal contact', error);
    res.status(502).json({ error: 'Failed to resolve contact' });
    return;
  }

  let contact = resolvedContact?.contact ?? null;
  let contactId = resolvedContact?.contactId ?? extractContactId(contact);
  let resolvedEmail = resolvedContact?.email ?? null;
  let resolvedPhone = resolvedContact?.phone ?? phone ?? null;

  if (!contactId && phone) {
    try {
      const fallbackContact = await lookupContactByPhone({ phone, countryCode: countryCode ?? null });
      if (fallbackContact) {
        const enriched = await resolvePortalContact({
          contact: fallbackContact,
          token: token ?? null,
          phone: phone ?? null,
          countryCode: countryCode ?? null,
          allowPhoneLookup: false,
        });
        contact = enriched?.contact ?? fallbackContact;
        contactId = enriched?.contactId ?? extractContactId(contact) ?? extractContactId(fallbackContact);
        resolvedEmail = enriched?.email ?? resolvedEmail ?? null;
        resolvedPhone = enriched?.phone ?? resolvedPhone ?? null;
      }
    } catch (error) {
      console.error('Failed to lookup Apex27 contact by phone', error);
    }
  }

  if (!contactId) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(404).json({ error: 'Contact not found' });
    return;
  }

  let contactContext;
  try {
    contactContext = await loadContactContext({ contactId });
  } catch (error) {
    console.error('Failed to load Apex27 contact context', error);
    res.status(502).json({ error: 'Failed to load contact context' });
    return;
  }

  const properties = normaliseProperties(contactContext?.properties);
  const appointments = normaliseAppointments(contactContext?.appointments, contactContext?.viewings);
  const financialSummary = buildFinancialSummary(contactContext?.financial);
  const notes = extractNotes(contactContext, contact);

  const context = {
    contactId: contactId ? String(contactId) : null,
    contact: buildContactDetails(contact ?? {}, { email: resolvedEmail, phone: resolvedPhone }),
    properties,
    appointments,
    financialSummary,
    notes,
    raw: {
      viewings: contactContext?.viewings ?? null,
      financialRecords: contactContext?.financial ?? null,
    },
  };

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ context });
}
