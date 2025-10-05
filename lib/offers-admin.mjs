import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const agents = require('../data/agents.json');
const supportData = require('../data/ai-support.json');
import { formatOfferFrequencyLabel } from './offer-frequency.mjs';
import { formatPriceGBP } from './format.mjs';
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

const RENT_FREQUENCY_TOKENS = new Set([
  'w',
  'pw',
  'perweek',
  'weekly',
  'week',
  'm',
  'pm',
  'pcm',
  'permonth',
  'monthly',
  'month',
  'q',
  'pq',
  'perquarter',
  'quarterly',
  'quarter',
  'y',
  'pa',
  'perannum',
  'annually',
  'year',
  'yearly',
]);

function normalizeFrequencyToken(value) {
  if (!value) {
    return '';
  }

  return String(value).trim().toLowerCase().replace(/[^a-z]/g, '');
}

function getOfferType(offer) {
  const token = normalizeFrequencyToken(offer?.frequency);
  if (token && RENT_FREQUENCY_TOKENS.has(token)) {
    return 'rent';
  }

  return 'sale';
}

export function formatOfferAmount(offer, type) {
  const price = offer?.price;
  if (type === 'rent') {
    const frequencyLabel = formatOfferFrequencyLabel(offer?.frequency);
    const normalisedLabel = typeof frequencyLabel === 'string'
      ? frequencyLabel.trim().toLowerCase()
      : '';
    const isAnnual = normalisedLabel === 'per annum';
    const formattedPrice =
      price != null ? formatPriceGBP(price, { isSale: !isAnnual }) : '';
    if (!formattedPrice) {
      return '';
    }

    return frequencyLabel ? `${formattedPrice} ${frequencyLabel}` : formattedPrice;
  }

  const formattedPrice =
    price != null ? formatPriceGBP(price, { isSale: type === 'sale' }) : '';

  return formattedPrice || '';
}

function buildOfferPresentation(offer) {
  const type = getOfferType(offer);
  const amount = formatOfferAmount(offer, type);
  const date = offer?.createdAt || offer?.updatedAt || null;

  return { amount, date, type };
}

export async function listOffersForAdmin() {
  try {
    const listingMap = buildListingMap();
    const contactMap = buildContactMap(listingMap);
    const agentMap = buildAgentMap();
    const rawOffers = await readOffers();
    const offers = Array.isArray(rawOffers) ? rawOffers : [];

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

      const fallbackProperty = (() => {
        const details = {};

        if (propertyId) {
          details.id = propertyId;
        }

        if (typeof offer.propertyTitle === 'string') {
          const trimmedTitle = offer.propertyTitle.trim();
          if (trimmedTitle) {
            details.title = offer.propertyTitle;
          }
        }

        if (typeof offer.propertyAddress === 'string') {
          const trimmedAddress = offer.propertyAddress.trim();
          if (trimmedAddress) {
            details.address = offer.propertyAddress;
          }
        }

        return Object.keys(details).length ? details : null;
      })();

      let property = propertyId ? listingMap.get(propertyId) || null : null;
      if (!property && fallbackProperty) {
        property = fallbackProperty;
      }
      const agent = agentId ? agentMap.get(agentId) || null : null;

      const presentation = buildOfferPresentation(offer);

      return {
        ...offer,
        ...presentation,
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
  } catch (error) {
    console.error('Unable to compose offers for admin dashboard', error);
    return [];
  }
}
