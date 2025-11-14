import { readJsonSync } from './read-json.mjs';
import { safeSync } from './safe-json.mjs';
import { formatOfferFrequencyLabel } from './offer-frequency.mjs';
import { formatPriceGBP } from './format.mjs';
import { formatOfferStatusLabel } from './offer-statuses.js';
import { readOffers } from './offers.js';
import { listApexOffers } from './apex27-offers.mjs';

const supportData = safeSync(() => readJsonSync('data', 'ai-support.json'), {});
const agents = safeSync(() => readJsonSync('data', 'agents.json'), []);

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

function buildListingMap(data = {}) {
  const listings = Array.isArray(data.listings) ? data.listings : [];
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

function buildContactMap(listingMap, data = {}) {
  const contacts = Array.isArray(data.contacts) ? data.contacts : [];
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

function buildAgentMap(agentEntriesSource = agents) {
  const agentEntries = Array.isArray(agentEntriesSource) ? agentEntriesSource : [];
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
  const statusLabel = offer?.statusLabel || formatOfferStatusLabel(offer?.status);

  return { amount, date, type, statusLabel };
}

export async function listOffersForAdmin() {
  try {
    const listingMap = buildListingMap(supportData);
    const contactMap = buildContactMap(listingMap, supportData);
    const agentMap = buildAgentMap(agents);
    const [apexOffers, storedOffers] = await Promise.all([
      listApexOffers(),
      readOffers(),
    ]);

    const seen = new Set();
    const mergedOffers = [];

    const allOffers = [
      ...(Array.isArray(apexOffers) ? apexOffers : []),
      ...(Array.isArray(storedOffers) ? storedOffers : []),
    ];

    for (const offer of allOffers) {
      if (!offer || typeof offer !== 'object') {
        continue;
      }

      const id = offer.id != null ? String(offer.id).trim() : '';
      if (id && seen.has(id)) {
        continue;
      }

      seen.add(id);
      mergedOffers.push({
        ...offer,
        source: offer.source || 'aktonz',
      });
    }

    return mergedOffers
      .map((offer) => {
      const contactId = offer.contactId ? String(offer.contactId) : '';
      const propertyId = offer.propertyId ? String(offer.propertyId) : '';
      const agentId = offer.agentId ? String(offer.agentId) : '';

      const fallbackContact = (() => {
        const details = {};
        const directContact = offer.contact && typeof offer.contact === 'object' ? offer.contact : null;

        if (directContact?.name) {
          details.name = directContact.name;
        }
        if (directContact?.email) {
          details.email = directContact.email;
        }
        if (directContact?.phone) {
          details.phone = directContact.phone;
        }

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

        const directProperty = offer.property && typeof offer.property === 'object' ? offer.property : null;

        if (typeof directProperty?.title === 'string' && directProperty.title.trim()) {
          details.title = directProperty.title.trim();
        }

        if (typeof directProperty?.address === 'string' && directProperty.address.trim()) {
          details.address = directProperty.address.trim();
        }

        const directLinkCandidates = [directProperty?.link, directProperty?.url, directProperty?.externalUrl];
        for (const candidate of directLinkCandidates) {
          if (typeof candidate === 'string' && candidate.trim()) {
            details.link = candidate.trim();
            break;
          }
        }

        if (typeof offer.propertyTitle === 'string') {
          const trimmedTitle = offer.propertyTitle.trim();
          if (trimmedTitle) {
            details.title = trimmedTitle;
          }
        }

        if (typeof offer.propertyAddress === 'string') {
          const trimmedAddress = offer.propertyAddress.trim();
          if (trimmedAddress) {
            details.address = trimmedAddress;
          }
        }

        if (typeof offer.propertyLink === 'string' && offer.propertyLink.trim()) {
          details.link = offer.propertyLink.trim();
        }

        if (!details.id && directProperty?.id) {
          details.id = String(directProperty.id).trim();
        }

        return Object.keys(details).length ? details : null;
      })();

      let property = propertyId ? listingMap.get(propertyId) || null : null;
      if (!property && fallbackProperty) {
        property = fallbackProperty;
      }
      if (property && fallbackProperty?.link && !property.link) {
        property = { ...property, link: fallbackProperty.link };
      }
      let agent = agentId ? agentMap.get(agentId) || null : null;
      if (!agent && offer.agent && typeof offer.agent === 'object') {
        agent = {
          ...offer.agent,
        };
      }

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
