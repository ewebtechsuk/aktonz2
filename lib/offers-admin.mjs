import agents from '../data/agents.json';
import supportData from '../data/ai-support.json';

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

export function listOffersForAdmin() {
  const listingMap = buildListingMap();
  const contactMap = buildContactMap(listingMap);
  const agentMap = buildAgentMap();
  const offers = Array.isArray(supportData.offers) ? supportData.offers : [];

  return offers
    .map((offer) => {
      const contact = contactMap.get(offer.contactId) || null;
      const property = offer.propertyId ? listingMap.get(offer.propertyId) || null : null;
      const agent = offer.agentId ? agentMap.get(String(offer.agentId)) || null : null;

      return {
        ...offer,
        contact,
        property,
        agent,
      };
    })
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
}
