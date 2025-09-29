import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const agents = require('../data/agents.json');
const supportData = require('../data/ai-support.json');
import { readOffers } from './offers.js';

function normalizeListingId(listing) {
  const rawId = listing?.id != null ? String(listing.id).trim() : '';
  if (rawId) {
    return rawId;
  }

  const link = typeof listing?.link === 'string' ? listing.link : '';
  if (!link) {
    return '';
  }

  const segments = link.split('/').filter(Boolean);
  return segments.length ? segments[segments.length - 1] : '';
}

function buildListingMap() {
  const listings = Array.isArray(supportData.listings) ? supportData.listings : [];
  const map = new Map();

  for (const listing of listings) {
    const id = normalizeListingId(listing);
    if (!id) {
      continue;
    }

    map.set(id, {
      ...listing,
      id,
    });
  }

  return map;
}

function buildContactMap(listingMap) {
  const contacts = Array.isArray(supportData.contacts) ? supportData.contacts : [];
  const map = new Map();

  for (const contact of contacts) {
    const relatedListings = Array.isArray(contact.relatedListings)
      ? contact.relatedListings.map((listingId) => listingMap.get(listingId)).filter(Boolean)
      : [];

    map.set(contact.id, {
      ...contact,
      relatedListings,
    });
  }

  return map;
}

function buildAgentMap() {
  const agentEntries = Array.isArray(agents) ? agents : [];
  return new Map(agentEntries.map((agent) => [String(agent.id), agent]));
}

function normalizeDate(value) {
  if (!value) {
    return 0;
  }

  const date = new Date(value);
  const timestamp = date.getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export async function listOffersForAdmin() {
  const listingMap = buildListingMap();
  const contactMap = buildContactMap(listingMap);
  const agentMap = buildAgentMap();
  const offers = await readOffers();

  return offers
    .map((offer) => {
      const contactId = offer.contactId ? String(offer.contactId) : '';
      const propertyId = offer.propertyId ? String(offer.propertyId) : '';
      const agentId = offer.agentId ? String(offer.agentId) : '';

      const fallbackContact = (() => {
        const details = {};
        if (offer.name) {
          details.name = offer.name;
        }
        if (offer.email) {
          details.email = offer.email;
        }
        if (offer.phone) {
          details.phone = offer.phone;
        }

        return Object.keys(details).length ? details : null;
      })();

      const rawContact = contactId ? contactMap.get(contactId) || null : null;
      let contact = null;

      if (rawContact) {
        contact = {
          ...rawContact,
        };

        if (fallbackContact?.name && !contact.name) {
          contact.name = fallbackContact.name;
        }
        if (fallbackContact?.email && !contact.email) {
          contact.email = fallbackContact.email;
        }
        if (fallbackContact?.phone && !contact.phone) {
          contact.phone = fallbackContact.phone;
        }
      } else if (fallbackContact) {
        contact = fallbackContact;
      }

      const property = propertyId ? listingMap.get(propertyId) || null : null;
      const agent = agentId ? agentMap.get(agentId) || null : null;

      return {
        ...offer,
        contact,
        property,
        agent,
      };
    })
    .sort((a, b) => {
      const right = normalizeDate(b.updatedAt || b.createdAt || b.date);
      const left = normalizeDate(a.updatedAt || a.createdAt || a.date);
      return right - left;
    });
}
