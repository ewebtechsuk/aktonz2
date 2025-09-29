import { applyApiHeaders, handlePreflight } from '../../../../lib/api-helpers.js';
import {
  resolvePortalContact,
  loadContactContext,
  lookupContactByPhone,
} from '../../../../lib/apex27-portal.js';
import { readSession } from '../../../../lib/session.js';
import { getAdminFromSession } from '../../../../lib/admin-users.mjs';

const CONTACT_ID_CANDIDATES = [
  'contactId',
  'ContactId',
  'contactID',
  'ContactID',
  'contact_id',
  'contactid',
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
];

function extractQueryValue(value) {
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

function extractContactId(contact) {
  if (!contact || typeof contact !== 'object') {
    return null;
  }

  for (const key of CONTACT_ID_CANDIDATES) {
    const value = contact[key];
    if (value != null && value !== '') {
      return value;
    }
  }

  return null;
}

function buildFinancialSummary(records) {
  if (!records) {
    return null;
  }

  const summary = {};

  if (Array.isArray(records)) {
    for (const record of records) {
      if (!record || typeof record !== 'object') {
        continue;
      }

      if (record.label && record.value != null && record.value !== '') {
        summary[record.label] = record.value;
        continue;
      }

      for (const [key, value] of Object.entries(record)) {
        if (value == null || value === '' || typeof value === 'object') {
          continue;
        }
        summary[key] = value;
      }
    }
  } else if (typeof records === 'object') {
    for (const [key, value] of Object.entries(records)) {
      if (value == null || value === '' || typeof value === 'object') {
        continue;
      }
      summary[key] = value;
    }
  }

  return Object.keys(summary).length > 0 ? summary : null;
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

  const token = extractQueryValue(req.query.token);
  const phone = extractQueryValue(req.query.phone);
  const countryCode = extractQueryValue(req.query.countryCode);

  if (!token && !phone) {
    res.status(400).json({ error: 'Missing lookup token or phone number' });
    return;
  }

  let resolvedContact = null;
  try {
    resolvedContact = await resolvePortalContact({
      token: token ?? null,
      phone: phone ?? null,
      countryCode: countryCode ?? null,
    });
  } catch (error) {
    console.error('Failed to resolve Apex27 portal contact', error);
    res.status(502).json({ error: 'Failed to resolve contact' });
    return;
  }

  let contact = resolvedContact?.contact ?? null;
  let contactId = resolvedContact?.contactId ?? extractContactId(contact);
  let resolvedPhone = resolvedContact?.phone ?? phone ?? null;

  if (!contactId && phone) {
    try {
      const fallbackContact = await lookupContactByPhone({
        phone,
        countryCode: countryCode ?? null,
      });

      if (fallbackContact) {
        const fallbackResolved = await resolvePortalContact(
          {
            contact: fallbackContact,
            phone,
            countryCode: countryCode ?? null,
            token: token ?? null,
          },
          { allowPhoneLookup: false }
        );

        contact = fallbackResolved?.contact ?? fallbackContact;
        contactId =
          fallbackResolved?.contactId ?? extractContactId(contact) ?? extractContactId(fallbackContact);
        resolvedPhone = fallbackResolved?.phone ?? resolvedPhone ?? extractQueryValue(fallbackContact?.phone);
      }
    } catch (error) {
      console.error('Failed to fallback to Apex27 contact lookup by phone', error);
    }
  }

  res.setHeader('Cache-Control', 'no-store');

  if (!contactId) {
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

  const properties = Array.isArray(contactContext?.properties) ? contactContext.properties : [];
  const appointments = Array.isArray(contactContext?.appointments) ? contactContext.appointments : [];
  const viewings = Array.isArray(contactContext?.viewings) ? contactContext.viewings : [];
  const financialRecords = Array.isArray(contactContext?.financial)
    ? contactContext.financial
    : contactContext?.financial
      ? [contactContext.financial]
      : [];

  const context = {
    contact: contact ?? { contactId },
    contactId,
    phone: resolvedPhone ?? null,
    properties,
    appointments,
    viewings,
    financialRecords,
    financialSummary: buildFinancialSummary(contactContext?.financial ?? null),
  };

  res.status(200).json({ context });
}
