import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  FaBell,
  FaCalendarAlt,
  FaCheckCircle,
  FaComments,
  FaEnvelope,
  FaHome,
  FaPaperPlane,
  FaRobot,
  FaTimes,
} from 'react-icons/fa';

import agents from '../data/agents.json';
import supportData from '../data/ai-support.json';
import styles from '../styles/ChatWidget.module.css';
import { useSession } from './SessionProvider';

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'that',
  'this',
  'what',
  'have',
  'need',
  'show',
  'listings',
  'listing',
  'properties',
  'property',
  'please',
  'about',
  'tell',
  'help',
  'find',
  'any',
  'are',
  'there',
  'do',
  'you',
  'me',
  'my',
  'of',
  'on',
  'up',
  'to',
  'in',
  'a',
  'an',
  'is',
]);

const PROPERTY_KEYWORD_REGEX =
  /(property|listing|home|flat|apartment|house|rent|rental|tenant|let|sale|buy|selling|purchase|to let|to rent|rooms?)/i;

function detectTransactionIntent(text) {
  if (!text) {
    return null;
  }
  const lower = text.toLowerCase();
  if (/(buy|sale|selling|purchase|vendor|mortgage)/.test(lower)) {
    return 'sale';
  }
  if (/(rent|tenant|letting|lease|pcm|per month|to let|to rent)/.test(lower)) {
    return 'rent';
  }
  return null;
}

function shouldStartPropertyFlow(text) {
  if (!text) {
    return false;
  }
  const lower = text.toLowerCase();
  if (!PROPERTY_KEYWORD_REGEX.test(lower)) {
    return false;
  }
  if (/(manage|management|valuations?|valuation|block|service charge)/.test(lower)) {
    return false;
  }
  return /(find|show|looking|need|available|search|any|list|book|schedule|view|viewing|options?)/.test(lower);
}

function shouldStartLandlordFlow(text) {
  if (!text) {
    return false;
  }
  const lower = text.toLowerCase();
  if (!/(landlord|let|rent out|let out|property management|valuation|list my)/.test(lower)) {
    return false;
  }

  if (/(i'm a landlord|im a landlord|i am a landlord)/.test(lower)) {
    return true;
  }

  if (/(rent|let|list)\s+(out\s+)?my\s+(home|flat|property|house)/.test(lower)) {
    return true;
  }

  if (/(book|arrange|schedule).*(rental|lettings?)\s+valuation/.test(lower)) {
    return true;
  }

  if (/(need|want).*(property management|manage my (home|property|flat))/.test(lower)) {
    return true;
  }

  return false;
}

function parsePriceRange(input) {
  if (!input) {
    return null;
  }
  const matches = String(input)
    .toLowerCase()
    .match(/£?\s*\d+(?:[\d,.]*)(?:\.\d+)?\s*(k|m)?/g);

  if (!matches) {
    return null;
  }

  const values = matches
    .map((match) => {
      const cleaned = match.trim();
      const unitMatch = cleaned.match(/(k|m)$/);
      const unit = unitMatch ? unitMatch[1] : null;
      const numericPart = cleaned
        .replace(/[^0-9.]/g, '')
        .replace(/\.(?=.*\.)/g, '');
      const value = Number(numericPart);
      if (!Number.isFinite(value)) {
        return null;
      }
      if (unit === 'm') {
        return Math.round(value * 1_000_000);
      }
      if (unit === 'k') {
        return Math.round(value * 1_000);
      }
      if (value > 0 && value < 1_000 && cleaned.includes('k')) {
        return Math.round(value * 1_000);
      }
      return Math.round(value);
    })
    .filter((value) => value != null && Number.isFinite(value));

  if (!values.length) {
    return null;
  }

  const sorted = values.sort((a, b) => a - b);
  return {
    min: sorted[0],
    max: sorted.length > 1 ? sorted[sorted.length - 1] : null,
  };
}

function parseBedrooms(input) {
  if (!input) {
    return null;
  }
  const lower = input.toLowerCase();
  if (/studio/.test(lower)) {
    return 0;
  }
  const match = lower.match(/(\d+)/);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function parsePropertyCategory(input) {
  if (!input) {
    return null;
  }
  const lower = input.toLowerCase();
  if (/(studio)/.test(lower)) return 'studio';
  if (/(apartment|flat)/.test(lower)) return 'flat';
  if (/(house|maisonette|home|terrace|townhouse)/.test(lower)) return 'house';
  if (/(room)/.test(lower)) return 'room';
  if (/(office|commercial)/.test(lower)) return 'commercial';
  return lower.trim() || null;
}

function isCancelMessage(input) {
  if (!input) {
    return false;
  }
  return /(cancel|stop|nevermind|never mind|exit|back|quit)/i.test(input);
}

function isSkipMessage(input) {
  if (!input) {
    return false;
  }
  return /(skip|no thanks|no thank|not now|later|maybe later)/i.test(input);
}

function isValidEmail(value) {
  if (typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function normalizePhone(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const digits = trimmed.replace(/[^0-9+]/g, '');
  if (!digits) {
    return null;
  }
  if (digits.startsWith('+')) {
    if (digits.length < 7) {
      return null;
    }
    return digits;
  }
  return digits.length >= 7 ? digits : null;
}

function matchPropertyFromText(input, properties = []) {
  if (!input || !Array.isArray(properties) || properties.length === 0) {
    return null;
  }
  const lower = input.toLowerCase();
  const numberMatch = lower.match(/(\d+)/);
  if (numberMatch) {
    const index = Number(numberMatch[1]);
    if (Number.isFinite(index) && index >= 1 && index <= properties.length) {
      return properties[index - 1];
    }
  }

  for (const property of properties) {
    if (!property) continue;
    const title = String(property.title || '').toLowerCase();
    const address = String(property.address || '').toLowerCase();
    const id = String(property.id || '').toLowerCase();
    if (title && lower.includes(title)) {
      return property;
    }
    if (address && lower.includes(address)) {
      return property;
    }
    if (id && lower.includes(id)) {
      return property;
    }
  }

  return null;
}

function parseDateTimeInput(input) {
  if (!input) {
    return null;
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const replacements = [trimmed, trimmed.replace(/\bat\b/i, ' ')];

  for (const candidate of replacements) {
    const parsed = Date.parse(candidate);
    if (!Number.isNaN(parsed)) {
      const date = new Date(parsed);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return null;
}

const createSearchText = (listing) =>
  [
    listing.id,
    listing.title,
    listing.address,
    listing.area,
    listing.summary,
    listing.price,
    listing.transactionType,
    listing.status,
    listing.tags?.join(' '),
    listing.bedrooms ? `${listing.bedrooms} bed` : null,
    listing.bathrooms ? `${listing.bathrooms} bath` : null,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const createKnowledgeBase = () => {
  const agentMap = new Map(agents.map((agent) => [String(agent.id), agent]));

  const team = (supportData.teamNotes || []).map((note) => {
    const linkedAgent = agentMap.get(String(note.id));
    return {
      id: note.id,
      name: linkedAgent?.name || note.name || 'Aktonz advisor',
      phone: linkedAgent?.phone,
      bio: linkedAgent?.bio,
      role: note.role,
      focus: note.focus || [],
      email: note.email || linkedAgent?.email,
    };
  });

  const listings = (supportData.listings || []).map((listing) => {
    const rawId = listing?.id != null ? String(listing.id).trim() : '';
    const derivedId =
      rawId ||
      (typeof listing?.link === 'string' && listing.link.includes('/property/')
        ? listing.link
            .split('/')
            .filter(Boolean)
            .pop()
        : '');
    const id = derivedId || rawId || null;
    const baseListing = {
      ...listing,
      id,
      transactionType: listing.transactionType || 'rent',
    };

    const link = id ? `/property/${encodeURIComponent(id)}` : null;

    return {
      ...baseListing,
      link,
      searchText: createSearchText(baseListing),
    };
  });
  const listingMap = new Map(listings.filter((listing) => listing.id).map((listing) => [listing.id, listing]));

  const contacts = (supportData.contacts || []).map((contact) => {
    const preferredAgent = agentMap.get(String(contact.preferredAgentId));
    const timeline = (contact.conversations || [])
      .map((event) => ({
        ...event,
        agent: agentMap.get(String(event.agentId)) || preferredAgent || null,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      ...contact,
      agent: preferredAgent || null,
      timeline,
      lastInteraction: timeline[0] || null,
      relatedListings: (contact.relatedListings || [])
        .map((id) => listingMap.get(id))
        .filter(Boolean),
    };
  });

  const contactMap = new Map(contacts.map((contact) => [contact.id, contact]));

  const appointments = (supportData.appointments || [])
    .map((appointment) => ({
      ...appointment,
      contact: contactMap.get(appointment.contactId) || null,
      agent: agentMap.get(String(appointment.agentId)) || null,
      property: appointment.propertyId ? listingMap.get(appointment.propertyId) || null : null,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const viewings = (supportData.viewings || [])
    .map((viewing) => ({
      ...viewing,
      contact: contactMap.get(viewing.contactId) || null,
      agent: agentMap.get(String(viewing.agentId)) || null,
      property: listingMap.get(viewing.propertyId) || null,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const offers = (supportData.offers || [])
    .map((offer) => {
      const contact = contactMap.get(offer.contactId) || null;
      return {
        ...offer,
        contact,
        property: listingMap.get(offer.propertyId) || null,
        agent: contact?.agent || null,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const landlord = {
    overview: supportData.landlordOverview || null,
    serviceTiers: Array.isArray(supportData.landlordServiceTiers)
      ? supportData.landlordServiceTiers
          .map((tier) => ({
            name: tier.name,
            summary: tier.summary,
            highlights: Array.isArray(tier.highlights) ? tier.highlights.filter(Boolean) : [],
          }))
          .filter((tier) => tier.name || tier.summary)
      : [],
    managementHighlights: Array.isArray(supportData.landlordManagementHighlights)
      ? supportData.landlordManagementHighlights.filter(Boolean)
      : [],
    valuationSteps: Array.isArray(supportData.landlordValuationSteps)
      ? supportData.landlordValuationSteps.filter(Boolean)
      : [],
    faqs: Array.isArray(supportData.landlordFaqs)
      ? supportData.landlordFaqs
          .map((faq) => ({
            question: faq.question,
            answer: faq.answer,
            keywords: Array.isArray(faq.keywords)
              ? faq.keywords.map((keyword) => String(keyword || '').toLowerCase()).filter(Boolean)
              : [],
          }))
          .filter((faq) => faq.answer)
      : [],
    onboardingIntro: supportData.landlordOnboardingIntro || null,
    confirmation: supportData.landlordConfirmation || null,
  };

  return {
    company: supportData.company,
    team,
    agents: Array.from(agentMap.values()),
    listings,
    contacts,
    appointments,
    viewings,
    offers,
    landlord,
  };
};

const searchListings = (input, knowledge) => {
  const lower = input.toLowerCase();
  const tokens = lower.split(/[^a-z0-9]+/).filter(Boolean);
  const rentFocus = /(rent|letting|tenant)/.test(lower);
  const saleFocus = /(buy|sale|selling|purchase|vendor)/.test(lower);
  const bedroomMatch = lower.match(/(\d+)\s*(?:bed|bedroom)/);
  const desiredBedrooms = bedroomMatch ? Number(bedroomMatch[1]) : null;

  const focusedTokens = tokens.filter((token) => token.length > 2 && !STOP_WORDS.has(token));
  const tokenGroups = focusedTokens.length ? [focusedTokens, tokens] : [tokens];
  let matches = [];

  for (const group of tokenGroups) {
    if (!group.length) continue;
    matches = knowledge.listings.filter((listing) => {
      if (rentFocus && listing.transactionType !== 'rent') return false;
      if (saleFocus && listing.transactionType !== 'sale') return false;
      if (desiredBedrooms && listing.bedrooms && listing.bedrooms < desiredBedrooms) return false;
      return group.some((token) => listing.searchText.includes(token));
    });
    if (matches.length) break;
  }

  if (!matches.length) {
    matches = knowledge.listings.filter((listing) => {
      if (rentFocus && listing.transactionType !== 'rent') return false;
      if (saleFocus && listing.transactionType !== 'sale') return false;
      if (desiredBedrooms && listing.bedrooms && listing.bedrooms < desiredBedrooms) return false;
      return true;
    });
  }

  return matches.slice(0, 3);
};

const createBotReplies = (input, knowledge, formatters, options = {}) => {
  const { isAuthenticated = false } = options;
  const lower = input.toLowerCase();
  const now = new Date();
  const replies = [];

  const respondWithCompanyProfile = () => {
    const company = knowledge.company;
    if (!company) {
      return false;
    }

    const sections = [];
    const headline = [company.name, company.tagline].filter(Boolean).join(' — ');
    if (headline) {
      sections.push(`${headline}.`);
    }
    if (company.mission) {
      sections.push(company.mission);
    }
    if (Array.isArray(company.services) && company.services.length) {
      sections.push(company.services.map((service) => `• ${service}`).join('\n'));
    }
    if (company.office) {
      const officeParts = [];
      if (company.office.address) {
        officeParts.push(`We're based at ${company.office.address}.`);
      }
      const contactBits = [];
      if (company.office.phone) {
        contactBits.push(`call ${company.office.phone}`);
      }
      if (company.office.email) {
        contactBits.push(`email ${company.office.email}`);
      }
      if (contactBits.length) {
        officeParts.push(`${contactBits.join(' or ')}`);
      }
      if (officeParts.length) {
        sections.push(officeParts.join(' '));
      }
    }

    replies.push({
      from: 'bot',
      type: 'text',
      text: sections.filter(Boolean).join('\n\n'),
    });

    return true;
  };

  const respondWithTeam = () => {
    if (!Array.isArray(knowledge.team) || !knowledge.team.length) {
      return false;
    }

    replies.push({
      from: 'bot',
      type: 'team',
      members: knowledge.team,
    });

    return true;
  };

  const respondWithListings = () => {
    const results = searchListings(input, knowledge);

    if (results.length) {
      const contextLabel = /(sale|buy|selling)/.test(lower)
        ? 'sales'
        : /(rent|letting|tenant)/.test(lower)
          ? 'rental'
          : 'standout';
      replies.push({
        from: 'bot',
        type: 'text',
        text: `Here are ${results.length} ${contextLabel} options that fit what you described.`,
      });
      replies.push({
        from: 'bot',
        type: 'listings',
        listings: results,
      });
    } else {
      replies.push({
        from: 'bot',
        type: 'text',
        text: "I couldn't find an exact match yet, but share a little more detail and I'll curate a shortlist.",
      });
    }
  };

  const findLandlordFaq = () => {
    if (!Array.isArray(knowledge.landlord?.faqs)) {
      return null;
    }

    for (const faq of knowledge.landlord.faqs) {
      if (!faq) continue;
      if (Array.isArray(faq.keywords) && faq.keywords.length) {
        if (faq.keywords.some((keyword) => lower.includes(keyword))) {
          return faq;
        }
      }
      if (faq.question && lower.includes(faq.question.toLowerCase())) {
        return faq;
      }
    }

    return null;
  };

  const respondWithLandlordOverview = () => {
    const landlord = knowledge.landlord;
    if (!landlord) {
      return false;
    }

    const segments = [];
    if (landlord.overview) {
      segments.push(landlord.overview);
    }

    if (Array.isArray(landlord.serviceTiers) && landlord.serviceTiers.length) {
      const lines = landlord.serviceTiers
        .map((tier) => {
          const label = tier.name ? `• ${tier.name}` : '• Service tier';
          return tier.summary ? `${label}: ${tier.summary}` : label;
        })
        .join('\n');
      segments.push(`Lettings service tiers:\n${lines}`);
    }

    if (Array.isArray(landlord.valuationSteps) && landlord.valuationSteps.length) {
      segments.push(
        `Valuation journey:\n${landlord.valuationSteps.map((step) => `• ${step}`).join('\n')}`,
      );
    }

    if (!segments.length) {
      return false;
    }

    replies.push({
      from: 'bot',
      type: 'text',
      text: segments.join('\n\n'),
    });

    return true;
  };

  const respondWithLandlordManagement = () => {
    const landlord = knowledge.landlord;
    if (!landlord || !Array.isArray(landlord.managementHighlights) || !landlord.managementHighlights.length) {
      return false;
    }

    replies.push({
      from: 'bot',
      type: 'text',
      text: `Property management highlights:\n${landlord.managementHighlights
        .map((item) => `• ${item}`)
        .join('\n')}`,
    });

    return true;
  };

  const respondWithLandlordFaq = () => {
    const faq = findLandlordFaq();
    if (!faq) {
      return false;
    }

    replies.push({
      from: 'bot',
      type: 'text',
      text: faq.answer,
    });

    return true;
  };

  const pushLandlordActions = () => {
    replies.push({
      from: 'bot',
      type: 'actions',
      title: 'Ready to let with Aktonz?',
      actions: [
        {
          id: 'landlord-onboarding',
          label: 'Book a rental valuation',
          icon: 'calendar',
          value: 'Book a rental valuation',
          metadata: { intent: 'landlordOnboarding' },
        },
      ],
    });
  };

  const respondWithViewingGuidance = () => {
    const office = knowledge.company?.office;
    const contactLine = office?.phone
      ? `Call ${office.phone} or share the property you're interested in and I'll help line up times.`
      : 'Share the property you want to see and I can help line up times with the team.';

    replies.push({
      from: 'bot',
      type: 'text',
      text: `We can arrange viewings seven days a week. ${contactLine}`,
    });
  };

  const respondWithAlerts = () => {
    replies.push({
      from: 'bot',
      type: 'text',
      text: "I'll keep you posted when similar listings go live. Drop your email or create an Aktonz account to manage alerts anytime.",
    });
  };

  const respondWithValuation = () => {
    replies.push({
      from: 'bot',
      type: 'text',
      text: 'Share your address and preferred timeframe at https://aktonz.com/valuation and our valuers will confirm an appointment straight away.',
    });
  };

  const requireAccountAccess = (topic) => {
    replies.push({
      from: 'bot',
      type: 'text',
      text: `Sign in to your Aktonz account to view ${topic}. Once you're logged in I can surface your conversations, appointments, offers and tenancy updates here in the chat.`,
    });
  };

  if (!isAuthenticated) {
    if (/(alert|notify|notification|update)/.test(lower)) {
      respondWithAlerts();
      return replies;
    }

    if (/(valuation|value my|appraisal|price my|market appraisal)/.test(lower)) {
      respondWithValuation();
      return replies;
    }

    if (/(company|aktonz|service|landlord service|sell my home|manage|management|what do you do)/.test(lower)) {
      respondWithCompanyProfile();
      return replies;
    }

    if (/(team|agent|advisor|negotiator|who can i speak)/.test(lower)) {
      replies.push({
        from: 'bot',
        type: 'text',
        text: 'Meet the Aktonz advisors who can help with lettings, sales and portfolio support.',
      });
      respondWithTeam();
      return replies;
    }

    if (/(viewing|tour|inspection|book)/.test(lower)) {
      respondWithViewingGuidance();
      return replies;
    }

    if (/(account|login|sign\s?in|register|profile|dashboard)/.test(lower)) {
      replies.push({
        from: 'bot',
        type: 'text',
        text: 'Create or sign in to your Aktonz account to save searches, manage viewings and keep everything in one place.',
      });
      return replies;
    }

    if (
      /(conversation|interaction|history|appointment|meeting|consult|call|offer|negotiation|deal|client|contact|landlord|tenant|buyer|seller|tenan(?:cy|cies)|management|portfolio|sales\b|lettings\b)/.test(
        lower,
      )
    ) {
      requireAccountAccess('your account updates');
      return replies;
    }

    if (/(listing|property|home|flat|apartment|house|rent|sale|buy|selling)/.test(lower)) {
      respondWithListings();
      return replies;
    }

    replies.push({
      from: 'bot',
      type: 'text',
      text: "I'm the Aktonz assistant. Ask me about available listings, how to book a viewing or what our team can support you with.",
    });

    return replies;
  }

  if (/(alert|notify|notification|update)/.test(lower)) {
    respondWithAlerts();
    return replies;
  }

  if (/(valuation|value my|appraisal|price my|market appraisal)/.test(lower)) {
    respondWithValuation();
    return replies;
  }

  if (/(landlord|let(?:ting)?|rent out|let out|property management|manage my property|rental valuation)/.test(lower)) {
    const answeredFaq = respondWithLandlordFaq();
    const overviewShared = respondWithLandlordOverview();
    const managementMentioned = /(manage|management|compliance|maintenance|rent collection|licen[cs]e)/.test(lower);
    if (managementMentioned) {
      respondWithLandlordManagement();
    }
    if (!answeredFaq && !overviewShared) {
      respondWithLandlordOverview();
    }
    pushLandlordActions();
    return replies;
  }

  const matchedContact = knowledge.contacts.find((contact) => {
    const name = contact.name.toLowerCase();
    const firstName = name.split(' ')[0];
    return lower.includes(name) || lower.includes(firstName);
  });

  if (matchedContact) {
    const lastTouch = matchedContact.lastInteraction
      ? formatters.describeRecency(new Date(matchedContact.lastInteraction.date))
      : null;

    replies.push({
      from: 'bot',
      type: 'text',
      text: `Here's the latest on ${matchedContact.name}: ${matchedContact.stage}. ${matchedContact.summary} ${
        lastTouch ? `We last spoke ${lastTouch} via ${matchedContact.lastInteraction.channel.toLowerCase()}.` : ''
      }`,
    });

    replies.push({
      from: 'bot',
      type: 'timeline',
      contact: matchedContact,
      events: matchedContact.timeline.slice(0, 5),
    });

    if (matchedContact.relatedListings.length) {
      replies.push({
        from: 'bot',
        type: 'listings',
        title: `${matchedContact.name}'s active shortlist`,
        listings: matchedContact.relatedListings,
      });
    }

    return replies;
  }

  if (lower.includes('conversation') || lower.includes('interaction') || lower.includes('history')) {
    replies.push({
      from: 'bot',
      type: 'text',
      text: 'Here are the latest touchpoints across your active clients.',
    });
    replies.push({
      from: 'bot',
      type: 'contacts',
      contacts: knowledge.contacts,
    });
    return replies;
  }

  if (/(appointment|meeting|consult|call)/.test(lower)) {
    const upcoming = knowledge.appointments.filter((appt) => new Date(appt.date) >= now);
    if (upcoming.length) {
      replies.push({
        from: 'bot',
        type: 'events',
        title: 'Upcoming appointments',
        items: upcoming.map((appt) => ({
          id: appt.id,
          title: `${appt.type} with ${appt.contact?.name || 'client'}`,
          time: formatters.formatDateTime(appt.date),
          description: appt.notes,
          meta: appt.location,
        })),
      });
    } else {
      replies.push({
        from: 'bot',
        type: 'text',
        text: "You don't have any future appointments in the diary.",
      });
    }
    return replies;
  }

  if (/(viewing|tour|inspection)/.test(lower)) {
    const upcoming = knowledge.viewings.filter((viewing) => new Date(viewing.date) >= now);
    if (upcoming.length) {
      replies.push({
        from: 'bot',
        type: 'events',
        title: 'Scheduled viewings',
        items: upcoming.map((viewing) => ({
          id: viewing.id,
          title: `${viewing.property?.title || 'Viewing'} with ${viewing.contact?.name || 'client'}`,
          time: formatters.formatDateTime(viewing.date),
          description: viewing.notes,
          meta: viewing.status,
        })),
      });
    } else {
      replies.push({
        from: 'bot',
        type: 'text',
        text: 'No live viewings are booked right now. Let me know if you would like to arrange one.',
      });
    }
    return replies;
  }

  if (
    /(sales pipeline|my sales|selling progress)/.test(lower)
  ) {
    const saleOffers = knowledge.offers.filter((offer) => offer.type === 'sale');
    if (saleOffers.length) {
      replies.push({
        from: 'bot',
        type: 'events',
        title: 'Sales pipeline',
        items: saleOffers.map((offer) => {
          const latestNote =
            Array.isArray(offer.notes) && offer.notes.length
              ? offer.notes[offer.notes.length - 1].note
              : '';
          return {
            id: offer.id,
            title: `${offer.contact?.name || 'Buyer'} — ${offer.amount}`,
            time: formatters.formatDateTime(offer.date),
            description: `${offer.property?.title || 'Property'} • ${offer.status}`,
            meta: latestNote,
          };
        }),
      });
    } else {
      replies.push({
        from: 'bot',
        type: 'text',
        text: 'There are no live sales offers right now.',
      });
    }
    return replies;
  }

  if (/(lettings pipeline|my lettings|rental pipeline)/.test(lower)) {
    const rentalOffers = knowledge.offers.filter((offer) => offer.type === 'rent');
    const upcomingViewings = knowledge.viewings.filter((viewing) => new Date(viewing.date) >= now);

    replies.push({
      from: 'bot',
      type: 'text',
      text: `You have ${rentalOffers.length} live tenancy offers and ${upcomingViewings.length} upcoming viewings. Want the full breakdown?`,
    });

    if (upcomingViewings.length) {
      replies.push({
        from: 'bot',
        type: 'events',
        title: 'Upcoming viewings',
        items: upcomingViewings.map((viewing) => ({
          id: viewing.id,
          title: `${viewing.property?.title || 'Viewing'} with ${viewing.contact?.name || 'client'}`,
          time: formatters.formatDateTime(viewing.date),
          description: viewing.notes,
          meta: viewing.status,
        })),
      });
    }

    if (rentalOffers.length) {
      replies.push({
        from: 'bot',
        type: 'events',
        title: 'Tenancy offers',
        items: rentalOffers.map((offer) => {
          const latestNote =
            Array.isArray(offer.notes) && offer.notes.length
              ? offer.notes[offer.notes.length - 1].note
              : '';
          return {
            id: offer.id,
            title: `${offer.contact?.name || 'Client'} — ${offer.amount}`,
            time: formatters.formatDateTime(offer.date),
            description: `${offer.property?.title || 'Property'} • ${offer.status}`,
            meta: latestNote,
          };
        }),
      });
    }

    return replies;
  }

  if (/(tenan(?:cy|cies)|management|portfolio)/.test(lower)) {
    const rentalOffers = knowledge.offers.filter((offer) => offer.type === 'rent');
    const upcomingViewings = knowledge.viewings.filter((viewing) => new Date(viewing.date) >= now);

    replies.push({
      from: 'bot',
      type: 'text',
      text: `Your management snapshot shows ${rentalOffers.length} tenancy offers in motion and ${upcomingViewings.length} viewing touchpoints scheduled. Let me know if you'd like the specifics.`,
    });
    return replies;
  }

  if (/(offer|negotiation|deal|accepted|rejected)/.test(lower)) {
    if (knowledge.offers.length) {
      replies.push({
        from: 'bot',
        type: 'events',
        title: 'Offer pipeline',
        items: knowledge.offers.map((offer) => {
          const latestNote =
            Array.isArray(offer.notes) && offer.notes.length
              ? offer.notes[offer.notes.length - 1].note
              : '';
          return {
            id: offer.id,
            title: `${offer.contact?.name || 'Client'} — ${offer.amount}`,
            time: formatters.formatDateTime(offer.date),
            description: `${offer.property?.title || 'Property'} • ${offer.status}`,
            meta: latestNote,
          };
        }),
      });
    } else {
      replies.push({
        from: 'bot',
        type: 'text',
        text: 'There are no open offers recorded today.',
      });
    }
    return replies;
  }

  if (/(contact|client|landlord|tenant|buyer|seller)/.test(lower)) {
    replies.push({
      from: 'bot',
      type: 'contacts',
      contacts: knowledge.contacts,
    });
    return replies;
  }

  if (/(team|agent|advisor|negotiator|who can i speak)/.test(lower)) {
    replies.push({
      from: 'bot',
      type: 'text',
      text: 'Your dedicated Aktonz advisors are on hand for lettings, sales and portfolio strategy.',
    });
    respondWithTeam();
    return replies;
  }

  if (
    /(company|aktonz|service|landlord service|sell my home|manage|management|what do you do)/.test(
      lower,
    )
  ) {
    respondWithCompanyProfile();
    return replies;
  }

  if (/(account|login|profile|preferences|saved search|dashboard)/.test(lower)) {
    replies.push({
      from: 'bot',
      type: 'text',
      text: 'Jump into your account dashboard to adjust search preferences, manage saved searches and review recent activity. The profile area keeps your details and move-in timeline accurate for the team.',
    });
    return replies;
  }

  if (/(listing|property|home|flat|apartment|house|rent|sale|buy|selling)/.test(lower)) {
    respondWithListings();
    return replies;
  }

  replies.push({
    from: 'bot',
    type: 'text',
    text: "I'm the Aktonz digital assistant. Ask me about your clients, viewings, offers or any listings and I'll bring the right details into the chat.",
  });

  return replies;
};

export default function ChatWidget() {
  const knowledge = useMemo(() => createKnowledgeBase(), []);
  const { user, loading: sessionLoading } = useSession();
  const isAuthenticated = Boolean(user);
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [isPanelRendered, setIsPanelRendered] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeFlow, setActiveFlow] = useState(null);
  const [recentPropertyResults, setRecentPropertyResults] = useState([]);
  const [leadDetails, setLeadDetails] = useState(null);
  const scrollRef = useRef(null);
  const typingTimeoutRef = useRef();
  const panelVisibilityTimeoutRef = useRef();
  const previousAuthState = useRef(isAuthenticated);

  const defaultMessages = useMemo(
    () =>
      isAuthenticated
        ? [
            {
              id: 'welcome-auth-1',
              from: 'bot',
              type: 'text',
              text: "Hi, I'm the Aktonz Intelligent Assistant. I'm connected to your account, so ask me about clients, conversations or listings.",
            },
            {
              id: 'welcome-auth-2',
              from: 'bot',
              type: 'text',
              text: 'I can pull up your viewings, appointments, offers and tenancy updates whenever you need them.',
            },
          ]
        : [
            {
              id: 'welcome-guest-1',
              from: 'bot',
              type: 'text',
              text: "Hi, I'm the Aktonz assistant. Ask me about our company or the latest listings and I'll help you book a viewing.",
            },
            {
              id: 'welcome-guest-2',
              from: 'bot',
              type: 'text',
              text: 'Sign in to unlock your saved conversations, appointments and offers.',
            },
          ],
    [isAuthenticated],
  );

  useEffect(() => {
    if (sessionLoading) {
      return;
    }

    if (messages.length === 0) {
      setMessages(defaultMessages);
    } else if (isAuthenticated && !previousAuthState.current) {
      setMessages((prev) => [
        ...prev,
        {
          id: `welcome-auth-upgrade-${Date.now()}`,
          from: 'bot',
          type: 'text',
          text: 'Thanks for signing in. I can now surface your conversations, viewings, offers and tenancy updates right here.',
        },
      ]);
    } else if (!isAuthenticated && previousAuthState.current) {
      setMessages((prev) => [
        ...prev,
        {
          id: `welcome-guest-reminder-${Date.now()}`,
          from: 'bot',
          type: 'text',
          text: 'You are signed out. I can still help with listings, booking viewings and sharing more about Aktonz.',
        },
      ]);
    }

    previousAuthState.current = isAuthenticated;
  }, [sessionLoading, defaultMessages, isAuthenticated, messages.length]);

  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    [],
  );
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    [],
  );
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        maximumFractionDigits: 0,
      }),
    [],
  );

  const formatDateTime = useCallback((value) => dateTimeFormatter.format(new Date(value)), [dateTimeFormatter]);
  const formatDate = useCallback((value) => dateFormatter.format(new Date(value)), [dateFormatter]);

  const formatBudgetRange = useCallback(
    (range, transactionType) => {
      if (!range) {
        return null;
      }
      const { min, max } = range;
      const parts = [];
      if (typeof min === 'number' && Number.isFinite(min)) {
        parts.push(currencyFormatter.format(min));
      }
      if (typeof max === 'number' && Number.isFinite(max) && max !== min) {
        parts.push(currencyFormatter.format(max));
      }

      if (!parts.length) {
        return null;
      }

      const joined = parts.length === 2 ? `${parts[0]} – ${parts[1]}` : parts[0];
      if (transactionType === 'rent') {
        return `${joined} pcm`;
      }
      return joined;
    },
    [currencyFormatter],
  );

  const describeRecency = useCallback((date) => {
    const now = Date.now();
    const diff = now - date.getTime();

    if (diff < 0) {
      const future = Math.abs(diff);
      const hours = Math.round(future / (1000 * 60 * 60));
      if (hours < 24) {
        return `in ${hours <= 1 ? 'about an hour' : `${hours} hours`}`;
      }
      const days = Math.round(future / (1000 * 60 * 60 * 24));
      return `in ${days === 1 ? 'a day' : `${days} days`}`;
    }

    const minutes = Math.round(diff / (1000 * 60));
    if (minutes <= 1) return 'just now';
    if (minutes < 60) return `${minutes} minutes ago`;

    const hours = Math.round(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;

    const days = Math.round(diff / (1000 * 60 * 60 * 24));
    if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;

    const weeks = Math.round(days / 7);
    if (weeks < 4) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;

    const months = Math.round(days / 30);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  }, []);

  const buildReplies = useCallback(
    (input) =>
      createBotReplies(
        input,
        knowledge,
        { formatDateTime, formatDate, describeRecency },
        { isAuthenticated },
      ),
    [knowledge, formatDateTime, formatDate, describeRecency, isAuthenticated],

  );

  const buildQuickActionsMessage = useCallback(
    () => ({
      type: 'actions',
      title: 'Need anything else?',
      actions: [
        {
          id: 'book-viewing',
          label: 'Book a viewing',
          icon: 'calendar',
          value: 'Book a viewing',
          metadata: { intent: 'bookViewing' },
        },
        {
          id: 'email-alerts',
          label: leadDetails?.email ? `Send alerts to ${leadDetails.email}` : 'Get email alerts',
          icon: 'bell',
          value: 'Get email alerts',
          metadata: { intent: 'emailAlerts' },
        },
        {
          id: 'landlord-workflow',
          label: 'Let my property',
          icon: 'home',
          value: 'Let my property',
          metadata: { intent: 'landlordOnboarding' },
        },
        {
          id: 'valuation-request',
          label: 'Request a valuation',
          icon: 'home',
          value: 'Request a valuation',
          metadata: { intent: 'valuation' },
        },
      ],
    }),
    [leadDetails],
  );

  const queryProperties = useCallback(async (filters) => {
    try {
      const res = await fetch('/api/chatbot/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to load listings');
      }

      const results = Array.isArray(payload?.results) ? payload.results : [];
      return results.map((item) => ({
        ...item,
        transactionType: item.transactionType || filters.transactionType || 'rent',
      }));
    } catch (error) {
      console.error('Chatbot property search failed', error);
      throw error instanceof Error ? error : new Error('Failed to load listings');
    }
  }, []);

  const submitLead = useCallback(
    async (lead, searchPreferences, properties = []) => {
      const payload = {
        name: lead?.name ?? '',
        email: lead?.email ?? '',
        phone: lead?.phone ?? null,
        source: 'chat-widget',
        preferences: {
          location: searchPreferences?.location ?? null,
          minPrice: searchPreferences?.minPrice ?? null,
          maxPrice: searchPreferences?.maxPrice ?? null,
          bedrooms: searchPreferences?.bedrooms ?? null,
          propertyType: searchPreferences?.propertyType ?? null,
          transactionType: searchPreferences?.transactionType ?? null,
        },
        properties: properties.map((property) => ({
          id: property?.id ?? null,
          title: property?.title ?? null,
          address: property?.address ?? null,
          price: property?.price ?? null,
          link: property?.link ?? null,
          image: property?.image ?? null,
          transactionType: property?.transactionType ?? null,
        })),
      };

      const res = await fetch('/api/chatbot/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to store lead');
      }

      setLeadDetails((prev) => ({
        name: lead?.name ?? prev?.name ?? '',
        email: lead?.email ?? prev?.email ?? '',
        phone: lead?.phone ?? prev?.phone ?? null,
      }));

      return data;
    },
    [setLeadDetails],
  );

  const submitLandlordEnquiry = useCallback(async (payload) => {
    const res = await fetch('/api/chatbot/landlords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        propertyAddress: payload.propertyAddress,
        propertyType: payload.propertyType,
        bedrooms: payload.bedrooms,
        expectedRent: payload.expectedRent,
        availableFrom: payload.availableFrom,
        notes: payload.notes,
        source: 'chat-widget',
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to submit landlord enquiry');
    }

    return data;
  }, []);

  const scheduleViewing = useCallback(async ({ name, email, phone, property, scheduledAt }) => {
    if (!property || !scheduledAt) {
      throw new Error('Missing property or time slot');
    }

    const res = await fetch('/api/chatbot/viewings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        phone: phone ?? null,
        propertyId: property.id ?? null,
        propertyTitle: property.title ?? null,
        propertyAddress: property.address ?? null,
        propertyLink: property.link ?? null,
        transactionType: property.transactionType ?? null,
        scheduledAt,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to schedule viewing');
    }

    return data;
  }, []);

  const startLandlordFlow = useCallback(() => {
    const flowId = `landlord-${Date.now()}`;
    const landlordKnowledge = knowledge.landlord;
    const introParts = [];
    if (landlordKnowledge?.overview) {
      introParts.push(landlordKnowledge.overview);
    }
    if (landlordKnowledge?.onboardingIntro) {
      introParts.push(landlordKnowledge.onboardingIntro);
    }
    const introText = introParts.length
      ? introParts.join(' ')
      : 'Great — let me take the details so our lettings team can get your property live.';

    setActiveFlow({
      id: flowId,
      type: 'landlordOnboarding',
      step: 'awaitingPropertyAddress',
      data: {
        propertyAddress: null,
        propertyType: null,
        bedrooms: null,
        expectedRent: null,
        availableFrom: null,
        landlord: { name: null, email: null, phone: null },
        notes: null,
      },
    });

    return [
      {
        type: 'text',
        text: introText,
      },
      {
        type: 'text',
        text: 'First up, what is the rental property address?',
      },
    ];
  }, [knowledge.landlord]);

  const startPropertyFlow = useCallback(
    (context = {}) => {
      const flowId = `property-${Date.now()}`;
      const transactionType =
        context.transactionType ?? detectTransactionIntent(context.initialText ?? '') ?? 'rent';

      setActiveFlow({
        id: flowId,
        type: 'propertySearch',
        step: 'awaitingLocation',
        data: {
          transactionType,
          location: null,
          minPrice: null,
          maxPrice: null,
          bedrooms: null,
          propertyType: null,
          budgetRange: null,
          results: [],
        },
      });
      setRecentPropertyResults([]);

      return [
        {
          type: 'text',
          text: `Great, I'll look for ${
            transactionType === 'sale' ? 'properties to buy' : 'places to rent'
          }. Which area or postcode should I search?`,
        },
      ];
    },
    [],
  );

  const handleLandlordFlowResponse = useCallback(
    async (text, metadata, flow) => {
      if (!flow || flow.type !== 'landlordOnboarding') {
        return [];
      }

      const flowId = flow.id;
      const trimmed = text.trim();

      if (isCancelMessage(trimmed)) {
        setActiveFlow((prev) => (prev && prev.id === flowId ? null : prev));
        return [
          {
            type: 'text',
            text: 'No worries — say “let my property” if you want to restart the landlord handover.',
          },
          buildQuickActionsMessage(),
        ];
      }

      if (flow.step === 'awaitingPropertyAddress') {
        if (!trimmed) {
          return [
            {
              type: 'text',
              text: 'Could you share the full rental address?',
            },
          ];
        }

        const address = trimmed.replace(/\s+/g, ' ').trim();
        setActiveFlow((prev) =>
          prev && prev.id === flowId
            ? {
                ...prev,
                step: 'awaitingPropertyType',
                data: {
                  ...prev.data,
                  propertyAddress: address,
                },
              }
            : prev,
        );

        return [
          {
            type: 'text',
            text: 'Thanks! What type of property is it? (Flat, house, HMO etc. — or say skip)',
          },
        ];
      }

      if (flow.step === 'awaitingPropertyType') {
        const propertyType = isSkipMessage(trimmed) ? null : trimmed.replace(/\s+/g, ' ').trim();

        setActiveFlow((prev) =>
          prev && prev.id === flowId
            ? {
                ...prev,
                step: 'awaitingBedrooms',
                data: {
                  ...prev.data,
                  propertyType,
                },
              }
            : prev,
        );

        return [
          {
            type: 'text',
            text: 'How many bedrooms does it have? (You can say skip)',
          },
        ];
      }

      if (flow.step === 'awaitingBedrooms') {
        let bedrooms = null;
        if (!isSkipMessage(trimmed)) {
          bedrooms = parseBedrooms(trimmed);
          if (bedrooms == null) {
            return [
              {
                type: 'text',
                text: 'I can log that as a number (e.g. 2). Let me know the bedroom count or say skip.',
              },
            ];
          }
        }

        setActiveFlow((prev) =>
          prev && prev.id === flowId
            ? {
                ...prev,
                step: 'awaitingExpectedRent',
                data: {
                  ...prev.data,
                  bedrooms,
                },
              }
            : prev,
        );

        return [
          {
            type: 'text',
            text: 'What monthly rent are you aiming for? A ballpark is perfect.',
          },
        ];
      }

      if (flow.step === 'awaitingExpectedRent') {
        let expectedRent = null;
        if (!isSkipMessage(trimmed)) {
          const range = parsePriceRange(trimmed);
          expectedRent = range?.max ?? range?.min ?? null;
          if (expectedRent == null) {
            return [
              {
                type: 'text',
                text: 'Share an approximate monthly rent (e.g. £2200) or say skip if you’d like advice.',
              },
            ];
          }
        }

        setActiveFlow((prev) =>
          prev && prev.id === flowId
            ? {
                ...prev,
                step: 'awaitingAvailability',
                data: {
                  ...prev.data,
                  expectedRent,
                },
              }
            : prev,
        );

        return [
          {
            type: 'text',
            text: 'When will it be ready for new tenants? (A date or rough timeframe works.)',
          },
        ];
      }

      if (flow.step === 'awaitingAvailability') {
        let availableFrom = null;
        if (!isSkipMessage(trimmed)) {
          const parsed = parseDateTimeInput(trimmed);
          if (!parsed) {
            return [
              {
                type: 'text',
                text: 'Got it. When roughly will the property be available? You can also say skip.',
              },
            ];
          }
          availableFrom = parsed.toISOString();
        }

        setActiveFlow((prev) =>
          prev && prev.id === flowId
            ? {
                ...prev,
                step: 'awaitingLandlordName',
                data: {
                  ...prev.data,
                  availableFrom,
                },
              }
            : prev,
        );

        return [
          {
            type: 'text',
            text: "Great. What's your name?",
          },
        ];
      }

      if (flow.step === 'awaitingLandlordName') {
        if (!trimmed) {
          return [
            {
              type: 'text',
              text: 'What name should I share with the lettings team?',
            },
          ];
        }

        const name = trimmed.replace(/\s+/g, ' ').trim();
        const firstName = name.split(' ')[0];

        setActiveFlow((prev) =>
          prev && prev.id === flowId
            ? {
                ...prev,
                step: 'awaitingLandlordEmail',
                data: {
                  ...prev.data,
                  landlord: {
                    ...(prev.data.landlord || {}),
                    name,
                  },
                },
              }
            : prev,
        );

        return [
          {
            type: 'text',
            text: `Thanks ${firstName}! Which email should I send the valuation pack to?`,
          },
        ];
      }

      if (flow.step === 'awaitingLandlordEmail') {
        if (!isValidEmail(trimmed)) {
          return [
            {
              type: 'text',
              text: 'Could you share a valid email address?',
            },
          ];
        }

        const email = trimmed.trim();
        setActiveFlow((prev) =>
          prev && prev.id === flowId
            ? {
                ...prev,
                step: 'awaitingLandlordPhone',
                data: {
                  ...prev.data,
                  landlord: {
                    ...(prev.data.landlord || {}),
                    email,
                  },
                },
              }
            : prev,
        );

        return [
          {
            type: 'text',
            text: 'And the best contact number so our lettings director can confirm the valuation?',
          },
        ];
      }

      if (flow.step === 'awaitingLandlordPhone') {
        const phone = normalizePhone(trimmed);
        if (!phone) {
          return [
            {
              type: 'text',
              text: 'Please include a phone number (with area code) so we can confirm the appointment.',
            },
          ];
        }

        setActiveFlow((prev) =>
          prev && prev.id === flowId
            ? {
                ...prev,
                step: 'awaitingLandlordNotes',
                data: {
                  ...prev.data,
                  landlord: {
                    ...(prev.data.landlord || {}),
                    phone,
                  },
                },
              }
            : prev,
        );

        return [
          {
            type: 'text',
            text: 'Any questions or priorities for lettings or management? I can note them or you can say skip.',
          },
        ];
      }

      if (flow.step === 'awaitingLandlordNotes') {
        const notes = isSkipMessage(trimmed) ? null : trimmed;
        const payload = {
          name: flow.data.landlord?.name || 'Aktonz landlord',
          email: flow.data.landlord?.email || '',
          phone: flow.data.landlord?.phone || null,
          propertyAddress: flow.data.propertyAddress,
          propertyType: flow.data.propertyType,
          bedrooms: flow.data.bedrooms,
          expectedRent: flow.data.expectedRent,
          availableFrom: flow.data.availableFrom,
          notes,
        };

        let knowledgeReplies = [];
        if (notes) {
          try {
            knowledgeReplies = buildReplies(notes) || [];
          } catch (error) {
            console.error('Failed to build landlord FAQ reply', error);
          }
        }

        try {
          await submitLandlordEnquiry(payload);
        } catch (error) {
          console.error('Failed to submit landlord enquiry', error);
          return [
            {
              type: 'text',
              text: 'Something went wrong saving those details. Could you try again?',
            },
          ];
        }

        setActiveFlow(null);

        const confirmationMessages = [];
        if (knowledgeReplies.length) {
          confirmationMessages.push(...knowledgeReplies);
        }

        const summaryParts = [];
        const name = payload.name;
        if (payload.propertyAddress) {
          summaryParts.push(`Thanks ${name.split(' ')[0] || name} — I’ve passed ${payload.propertyAddress} to the lettings team.`);
        } else {
          summaryParts.push(`Thanks ${name.split(' ')[0] || name} — I’ve logged your landlord details for the lettings team.`);
        }
        if (typeof payload.expectedRent === 'number') {
          summaryParts.push(`We’ll review pricing around ${currencyFormatter.format(payload.expectedRent)} pcm.`);
        }
        if (payload.availableFrom) {
          summaryParts.push(`We’ll aim for a go-live around ${formatDate(payload.availableFrom)}.`);
        }
        if (payload.email || payload.phone) {
          const contactBits = [];
          if (payload.email) contactBits.push(`email ${payload.email}`);
          if (payload.phone) contactBits.push(`call ${payload.phone}`);
          if (contactBits.length) {
            summaryParts.push(`We’ll ${contactBits.join(' and ')} with the valuation confirmation.`);
          }
        }

        confirmationMessages.push({
          type: 'text',
          text: summaryParts.join(' '),
        });

        if (knowledge.landlord?.confirmation) {
          confirmationMessages.push({
            type: 'text',
            text: knowledge.landlord.confirmation,
          });
        }

        confirmationMessages.push(buildQuickActionsMessage());
        return confirmationMessages;
      }

      return [];
    },
    [
      setActiveFlow,
      buildQuickActionsMessage,
      buildReplies,
      submitLandlordEnquiry,
      knowledge.landlord,
      currencyFormatter,
      formatDate,
    ],
  );

  const handlePropertyFlowResponse = useCallback(
    async (text, metadata, flow) => {
      if (!flow || flow.type !== 'propertySearch') {
        return [];
      }

      const flowId = flow.id;
      const trimmed = text.trim();

      if (isCancelMessage(trimmed)) {
        setActiveFlow((prev) => (prev && prev.id === flowId ? null : prev));
        return [
          {
            type: 'text',
            text: 'No problem — let me know if you want to restart your search.',
          },
        ];
      }

      if (flow.step === 'awaitingLocation') {
        if (!trimmed) {
          return [
            {
              type: 'text',
              text: 'Which neighbourhood or postcode should I focus on?',
            },
          ];
        }

        setActiveFlow((prev) =>
          prev && prev.id === flowId
            ? {
                ...prev,
                step: 'awaitingBudget',
                data: {
                  ...prev.data,
                  location: trimmed,
                },
              }
            : prev,
        );

        return [
          {
            type: 'text',
            text: `Perfect — searching around ${trimmed}. What's your ideal budget range?`,
          },
        ];
      }

      if (flow.step === 'awaitingBudget') {
        if (isSkipMessage(trimmed)) {
          setActiveFlow((prev) =>
            prev && prev.id === flowId
              ? {
                  ...prev,
                  step: 'awaitingBedrooms',
                  data: {
                    ...prev.data,
                    minPrice: null,
                    maxPrice: null,
                    budgetRange: null,
                  },
                }
              : prev,
          );
          return [
            {
              type: 'text',
              text: 'No worries. How many bedrooms are you looking for?',
            },
          ];
        }

        const range = parsePriceRange(trimmed);
        if (!range) {
          return [
            {
              type: 'text',
              text: 'Could you share a budget range? For example “£1,800 to £2,200”.',
            },
          ];
        }

        const summary = formatBudgetRange(range, flow.data.transactionType);
        setActiveFlow((prev) =>
          prev && prev.id === flowId
            ? {
                ...prev,
                step: 'awaitingBedrooms',
                data: {
                  ...prev.data,
                  minPrice: range.min ?? null,
                  maxPrice: range.max ?? null,
                  budgetRange: range,
                },
              }
            : prev,
        );

        return [
          {
            type: 'text',
            text: summary
              ? `Great — I'll focus on places around ${summary}. How many bedrooms do you need?`
              : 'Great — how many bedrooms do you need?',
          },
        ];
      }

      if (flow.step === 'awaitingBedrooms') {
        if (isSkipMessage(trimmed)) {
          setActiveFlow((prev) =>
            prev && prev.id === flowId
              ? {
                  ...prev,
                  step: 'awaitingPropertyType',
                  data: {
                    ...prev.data,
                    bedrooms: null,
                  },
                }
              : prev,
          );
          return [
            {
              type: 'text',
              text: 'Any preferred property type? (e.g. flat, house, studio)',
            },
          ];
        }

        const bedrooms = parseBedrooms(trimmed);
        if (bedrooms == null) {
          return [
            {
              type: 'text',
              text: 'Let me know the minimum number of bedrooms you need.',
            },
          ];
        }

        setActiveFlow((prev) =>
          prev && prev.id === flowId
            ? {
                ...prev,
                step: 'awaitingPropertyType',
                data: {
                  ...prev.data,
                  bedrooms,
                },
              }
            : prev,
        );

        return [
          {
            type: 'text',
            text: 'Thanks! Do you have a preferred property type (flat, house, studio)?',
          },
        ];
      }

      if (flow.step === 'awaitingPropertyType') {
        const propertyType = isSkipMessage(trimmed)
          ? null
          : parsePropertyCategory(trimmed) || trimmed || null;

        setActiveFlow((prev) =>
          prev && prev.id === flowId
            ? {
                ...prev,
                step: 'fetching',
                data: {
                  ...prev.data,
                  propertyType,
                },
              }
            : prev,
        );

        const searchData = {
          ...flow.data,
          propertyType,
        };

        try {
          const results = await queryProperties({
            location: searchData.location,
            minPrice: searchData.minPrice,
            maxPrice: searchData.maxPrice,
            bedrooms: searchData.bedrooms,
            propertyType,
            transactionType: searchData.transactionType,
          });

          setRecentPropertyResults(results);

          if (!results.length) {
            setActiveFlow((prev) =>
              prev && prev.id === flowId
                ? {
                    ...prev,
                    step: 'awaitingLocation',
                    data: {
                      ...prev.data,
                      propertyType,
                      results: [],
                    },
                  }
                : prev,
            );
            return [
              {
                type: 'text',
                text: "I couldn't find an exact match yet. Want to try a different area or adjust the budget?",
              },
            ];
          }

          const summaryParts = [];
          if (searchData.location) {
            summaryParts.push(`around ${searchData.location}`);
          }
          const budgetSummary = formatBudgetRange(searchData.budgetRange, searchData.transactionType);
          if (budgetSummary) {
            summaryParts.push(`within ${budgetSummary}`);
          }
          if (searchData.bedrooms != null) {
            summaryParts.push(`${searchData.bedrooms}+ bedrooms`);
          }

          const intro = summaryParts.length
            ? `Here are ${results.length} options ${summaryParts.join(', ')}.`
            : `Here are ${results.length} properties that could work.`;

          const replies = [
            { type: 'text', text: intro },
            { type: 'listings', listings: results },
          ];

          const nextData = {
            ...flow.data,
            propertyType,
            results,
          };

          if (leadDetails?.email) {
            try {
              await submitLead(
                leadDetails,
                {
                  location: nextData.location,
                  minPrice: nextData.minPrice,
                  maxPrice: nextData.maxPrice,
                  bedrooms: nextData.bedrooms,
                  propertyType: nextData.propertyType,
                  transactionType: nextData.transactionType,
                },
                results,
              );
            } catch (error) {
              console.error('Failed to update lead from property search', error);
              replies.push({
                type: 'text',
                text: "I couldn't log the search preferences just now, but you can still review these listings.",
              });
            }

            setActiveFlow(null);
            replies.push({
              type: 'text',
              text: `I'll send fresh matches to ${leadDetails.email}. Let me know if you want to tweak anything.`,
            });
            replies.push(buildQuickActionsMessage());
            return replies;
          }

          setActiveFlow((prev) =>
            prev && prev.id === flowId
              ? {
                  ...prev,
                  step: 'awaitingLeadName',
                  data: nextData,
                }
              : prev,
          );

          replies.push({
            type: 'text',
            text: 'Can I take your name so I can email the full details and future matches?',
          });

          return replies;
        } catch (error) {
          setActiveFlow((prev) =>
            prev && prev.id === flowId
              ? {
                  ...prev,
                  step: 'awaitingPropertyType',
                }
              : prev,
          );
          return [
            {
              type: 'text',
              text: 'I had trouble reaching the listings just now. Could you try again in a moment?',
            },
          ];
        }
      }

      if (flow.step === 'awaitingLeadName') {
        if (isSkipMessage(trimmed)) {
          setActiveFlow(null);
          return [
            {
              type: 'text',
              text: 'No problem — you can ask me for new listings anytime.',
            },
            buildQuickActionsMessage(),
          ];
        }

        if (!trimmed) {
          return [
            {
              type: 'text',
              text: 'What name should I use when I send the details?',
            },
          ];
        }

        const name = trimmed.replace(/\s+/g, ' ').trim();
        setActiveFlow((prev) =>
          prev && prev.id === flowId
            ? {
                ...prev,
                step: 'awaitingLeadEmail',
                data: {
                  ...prev.data,
                  lead: {
                    ...(prev.data.lead || {}),
                    name,
                  },
                },
              }
            : prev,
        );

        return [
          {
            type: 'text',
            text: `Thanks ${name}! What's the best email for updates?`,
          },
        ];
      }

      if (flow.step === 'awaitingLeadEmail') {
        if (!isValidEmail(trimmed)) {
          return [
            {
              type: 'text',
              text: 'Could you share a valid email address so I can send the shortlist?',
            },
          ];
        }

        const email = trimmed.trim();
        setActiveFlow((prev) =>
          prev && prev.id === flowId
            ? {
                ...prev,
                step: 'awaitingLeadPhone',
                data: {
                  ...prev.data,
                  lead: {
                    ...(prev.data.lead || {}),
                    email,
                  },
                },
              }
            : prev,
        );

        return [
          {
            type: 'text',
            text: 'Great — and a contact number in case the property team need to reach you?',
          },
        ];
      }

      if (flow.step === 'awaitingLeadPhone') {
        let phone = null;
        if (!isSkipMessage(trimmed)) {
          phone = normalizePhone(trimmed);
          if (!phone) {
            return [
              {
                type: 'text',
                text: 'Please share a contact number (or say skip if you prefer email only).',
              },
            ];
          }
        }

        const lead = {
          ...(flow.data.lead || {}),
          phone,
        };

        try {
          await submitLead(
            lead,
            {
              location: flow.data.location,
              minPrice: flow.data.minPrice,
              maxPrice: flow.data.maxPrice,
              bedrooms: flow.data.bedrooms,
              propertyType: flow.data.propertyType,
              transactionType: flow.data.transactionType,
            },
            flow.data.results || recentPropertyResults,
          );

          setActiveFlow(null);

          return [
            {
              type: 'text',
              text: `Brilliant — I'll email ${lead.email} with the details and send new matches as they appear.`,
            },
            buildQuickActionsMessage(),
          ];
        } catch (error) {
          console.error('Failed to submit chatbot lead', error);
          return [
            {
              type: 'text',
              text: 'I had trouble saving that. Could we try the number again?',
            },
          ];
        }
      }

      return [];
    },
    [
      formatBudgetRange,
      queryProperties,
      submitLead,
      buildQuickActionsMessage,
      leadDetails,
      recentPropertyResults,
    ],
  );

  const startBookViewingFlow = useCallback(
    (options = {}) => {
      if (!recentPropertyResults.length) {
        const followUp = startPropertyFlow(options);
        return [
          {
            type: 'text',
            text: "Let's narrow things down first. Tell me the area you're exploring.",
          },
          ...followUp,
        ];
      }

      const flowId = `book-${Date.now()}`;
      const propertyOptions = Array.isArray(options.propertyOptions)
        ? options.propertyOptions
        : recentPropertyResults.slice(0, 5);
      const selectedProperty =
        options.property ||
        (options.propertyId
          ? propertyOptions.find((item) => item.id === options.propertyId)
          : null);

      if (selectedProperty) {
        setActiveFlow({
          id: flowId,
          type: 'bookViewing',
          step: 'awaitingDate',
          data: {
            propertyOptions,
            property: selectedProperty,
          },
        });
        return [
          {
            type: 'text',
            text: `Brilliant — ${selectedProperty.title}. What date and time works for you?`,
          },
        ];
      }

      setActiveFlow({
        id: flowId,
        type: 'bookViewing',
        step: 'awaitingProperty',
        data: {
          propertyOptions,
        },
      });

      return [
        {
          type: 'text',
          text: 'Sure thing — which property would you like to view?',
        },
        {
          type: 'actions',
          title: 'Select a property',
          actions: propertyOptions.map((property, index) => ({
            id: property.id || `property-${index}`,
            label: `${index + 1}. ${property.title}`,
            secondary: property.address,
            value: property.title,
            metadata: { intent: 'bookViewingSelect', propertyId: property.id, property },
          })),
        },
      ];
    },
    [recentPropertyResults, startPropertyFlow],
  );

  const handleBookViewingFlow = useCallback(
    async (text, metadata, flow) => {
      if (!flow || flow.type !== 'bookViewing') {
        return [];
      }

      const flowId = flow.id;
      const trimmed = text.trim();

      if (isCancelMessage(trimmed)) {
        setActiveFlow((prev) => (prev && prev.id === flowId ? null : prev));
        return [
          {
            type: 'text',
            text: 'No worries — let me know if you’d like to schedule it later.',
          },
        ];
      }

      const propertyOptions =
        Array.isArray(flow.data?.propertyOptions) && flow.data.propertyOptions.length
          ? flow.data.propertyOptions
          : recentPropertyResults;

      if (flow.step === 'awaitingProperty') {
        let property = null;
        if (metadata?.property) {
          property = metadata.property;
        } else if (metadata?.propertyId) {
          property = propertyOptions.find((item) => item.id === metadata.propertyId) || null;
        }
        if (!property) {
          property = matchPropertyFromText(trimmed, propertyOptions);
        }
        if (!property) {
          return [
            {
              type: 'text',
              text: 'Tap one of the property buttons above or let me know the address so I can schedule it.',
            },
          ];
        }
        setActiveFlow((prev) =>
          prev && prev.id === flowId
            ? {
                ...prev,
                step: 'awaitingDate',
                data: {
                  ...prev.data,
                  property,
                },
              }
            : prev,
        );
        return [
          {
            type: 'text',
            text: `Great — ${property.title}. What date and time works for you?`,
          },
        ];
      }

      if (flow.step === 'awaitingDate') {
        const property = flow.data?.property;
        if (!property) {
          setActiveFlow(null);
          return [
            {
              type: 'text',
              text: 'Let me know which property you had in mind first.',
            },
          ];
        }
        const requested = parseDateTimeInput(trimmed);
        if (!requested) {
          return [
            {
              type: 'text',
              text: 'Could you share the date and time in a format like “25 March at 3:00pm”?',
            },
          ];
        }
        const iso = requested.toISOString();
        const readable = formatDateTime(iso);

        if (leadDetails?.name && leadDetails?.email) {
          try {
            await scheduleViewing({
              name: leadDetails.name,
              email: leadDetails.email,
              phone: leadDetails.phone ?? null,
              property,
              scheduledAt: iso,
            });
            await submitLead(
              leadDetails,
              {
                location: flow.data?.location ?? property.address ?? null,
                minPrice: flow.data?.minPrice ?? null,
                maxPrice: flow.data?.maxPrice ?? null,
                bedrooms: flow.data?.bedrooms ?? null,
                propertyType: property.propertyType ?? null,
                transactionType:
                  property.transactionType ??
                  flow.data?.transactionType ??
                  detectTransactionIntent(property?.transactionType) ??
                  'rent',
              },
              [property],
            );
          } catch (error) {
            console.error('Failed to confirm viewing for existing lead', error);
            return [
              {
                type: 'text',
                text: 'I hit a snag confirming that slot. Could you share another time or try again shortly?',
              },
            ];
          }
          setActiveFlow(null);
          return [
            {
              type: 'text',
              text: `All set — you're booked for ${readable}. I'll email the confirmation to ${leadDetails.email}.`,
            },
            buildQuickActionsMessage(),
          ];
        }

        setActiveFlow((prev) =>
          prev && prev.id === flowId
            ? {
                ...prev,
                step: 'awaitingName',
                data: {
                  ...prev.data,
                  scheduledAt: iso,
                },
              }
            : prev,
        );
        return [
          {
            type: 'text',
            text: `Perfect. May I take your name so I can confirm the ${readable} viewing?`,
          },
        ];
      }

      if (flow.step === 'awaitingName') {
        if (!trimmed) {
          return [
            {
              type: 'text',
              text: 'What name should I pass to the viewing team?',
            },
          ];
        }
        const name = trimmed.replace(/\s+/g, ' ').trim();
        setActiveFlow((prev) =>
          prev && prev.id === flowId
            ? {
                ...prev,
                step: 'awaitingEmail',
                data: {
                  ...prev.data,
                  lead: {
                    ...(prev.data.lead || {}),
                    name,
                  },
                },
              }
            : prev,
        );
        return [
          {
            type: 'text',
            text: `Thanks ${name}. What's the best email for the confirmation?`,
          },
        ];
      }

      if (flow.step === 'awaitingEmail') {
        if (!isValidEmail(trimmed)) {
          return [
            {
              type: 'text',
              text: 'Could you share a valid email address so I can send the confirmation?',
            },
          ];
        }
        const email = trimmed.trim();
        setActiveFlow((prev) =>
          prev && prev.id === flowId
            ? {
                ...prev,
                step: 'awaitingPhone',
                data: {
                  ...prev.data,
                  lead: {
                    ...(prev.data.lead || {}),
                    email,
                  },
                },
              }
            : prev,
        );
        return [
          {
            type: 'text',
            text: 'And finally, a contact number in case the agent needs to reach you?',
          },
        ];
      }

      if (flow.step === 'awaitingPhone') {
        const phone = normalizePhone(trimmed);
        if (!phone) {
          return [
            {
              type: 'text',
              text: 'Please include a contact number (with area code) so we can confirm details.',
            },
          ];
        }
        const property = flow.data?.property;
        const scheduledAt = flow.data?.scheduledAt;
        if (!property || !scheduledAt) {
          setActiveFlow(null);
          return [
            {
              type: 'text',
              text: 'Let’s restart — tell me which property you’d like to view.',
            },
          ];
        }
        const lead = {
          ...(flow.data.lead || {}),
          phone,
        };
        try {
          await scheduleViewing({
            name: lead.name,
            email: lead.email,
            phone,
            property,
            scheduledAt,
          });
          await submitLead(
            lead,
            {
              location: property.address ?? flow.data?.location ?? null,
              minPrice: flow.data?.minPrice ?? null,
              maxPrice: flow.data?.maxPrice ?? null,
              bedrooms: flow.data?.bedrooms ?? null,
              propertyType: property.propertyType ?? null,
              transactionType:
                property.transactionType ??
                flow.data?.transactionType ??
                detectTransactionIntent(property?.transactionType) ??
                'rent',
            },
            [property],
          );
        } catch (error) {
          console.error('Failed to schedule chatbot viewing', error);
          return [
            {
              type: 'text',
              text: 'Something went wrong scheduling that viewing. Could you try again or share another time?',
            },
          ];
        }
        setActiveFlow(null);
        return [
          {
            type: 'text',
            text: `All booked — I'll send the confirmation to ${lead.email} and the team will be in touch if anything changes.`,
          },
          buildQuickActionsMessage(),
        ];
      }

      return [];
    },
    [
      recentPropertyResults,
      scheduleViewing,
      submitLead,
      leadDetails,
      formatDateTime,
      buildQuickActionsMessage,
    ],
  );

  const handleIncomingMessage = useCallback(
    async (text, metadata = null) => {
      const trimmed = (text ?? '').trim();
      const lower = trimmed.toLowerCase();

      if (metadata?.intent === 'emailAlerts') {
        if (leadDetails?.email) {
          return [
            {
              type: 'text',
              text: `I'll send new matches straight to ${leadDetails.email}. Let me know if you want to adjust your search.`,
            },
          ];
        }
        return [
          {
            type: 'text',
            text: 'Share the area, budget and your email and I’ll set up instant alerts for you.',
          },
        ];
      }

      if (metadata?.intent === 'landlordOnboarding') {
        return startLandlordFlow();
      }

      if (metadata?.intent === 'valuation') {
        return [
          {
            type: 'text',
            text: 'Request a valuation any time at https://aktonz.com/valuation or tell me your address and I’ll arrange the team to contact you.',
          },
        ];
      }

      if (metadata?.intent === 'bookViewing') {
        return startBookViewingFlow({ property: metadata.property || null });
      }

      if (metadata?.intent === 'bookViewingSelect' && activeFlow?.type === 'bookViewing') {
        return handleBookViewingFlow(trimmed, metadata, activeFlow);
      }

      if (activeFlow?.type === 'landlordOnboarding') {
        return handleLandlordFlowResponse(trimmed, metadata, activeFlow);
      }

      if (activeFlow?.type === 'propertySearch') {
        return handlePropertyFlowResponse(trimmed, metadata, activeFlow);
      }

      if (activeFlow?.type === 'bookViewing') {
        return handleBookViewingFlow(trimmed, metadata, activeFlow);
      }

      if (metadata?.intent === 'bookViewingSelect') {
        return startBookViewingFlow({
          property: metadata.property || null,
          propertyId: metadata.propertyId,
        });
      }

      if (metadata?.intent === 'propertySearch') {
        return startPropertyFlow({ initialText: trimmed, transactionType: metadata.transactionType });
      }

      if (shouldStartLandlordFlow(trimmed)) {
        return startLandlordFlow();
      }

      if (shouldStartPropertyFlow(trimmed)) {
        return startPropertyFlow({ initialText: trimmed });
      }

      if (
        metadata?.intent === 'bookViewing' ||
        (recentPropertyResults.length && /(book|schedule).*(viewing|tour)/.test(lower))
      ) {
        return startBookViewingFlow({});
      }

      if (!trimmed && !metadata) {
        return [];
      }

      return buildReplies(trimmed);
    },
    [
      activeFlow,
      startBookViewingFlow,
      handleBookViewingFlow,
      handleLandlordFlowResponse,
      handlePropertyFlowResponse,
      startPropertyFlow,
      startLandlordFlow,
      recentPropertyResults,
      buildReplies,
      leadDetails,
    ],
  );

  const sendMessage = useCallback(
    (providedText, options = {}) => {
      const { metadata = null, skipUserMessage = false } = options;
      const raw = typeof providedText === 'string' ? providedText : inputValue;
      const text = raw != null ? raw.trim() : '';

      if (!text && !metadata) {
        return;
      }

      if (!isOpen) {
        setIsOpen(true);
      }

      if (!skipUserMessage && text) {
        const userMessage = {
          id: `user-${Date.now()}`,
          from: 'user',
          type: 'text',
          text,
        };
        setMessages((prev) => [...prev, userMessage]);
      }

      if (!skipUserMessage) {
        setInputValue('');
      }

      setIsTyping(true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      const processResponse = async () => {
        try {
          const replies = await handleIncomingMessage(text, metadata);
          if (Array.isArray(replies) && replies.length) {
            const mapped = replies.map((reply, index) => ({
              ...reply,
              from: reply.from || 'bot',
              id: `${reply.type || 'text'}-${Date.now()}-${index}`,
            }));
            setMessages((prev) => [...prev, ...mapped]);
          }
        } catch (error) {
          console.error('Chatbot failed to handle message', error);
          setMessages((prev) => [
            ...prev,
            {
              id: `bot-error-${Date.now()}`,
              from: 'bot',
              type: 'text',
              text: 'Something went wrong — please try again in a moment.',
            },
          ]);
        } finally {
          setIsTyping(false);
        }
      };

      typingTimeoutRef.current = setTimeout(processResponse, 450);
    },
    [inputValue, isOpen, handleIncomingMessage],
  );

  const handleAction = useCallback(
    (action) => {
      if (!action) {
        return;
      }

      const metadata = action.metadata || null;
      const value = action.value ?? action.label ?? '';
      sendMessage(value, {
        metadata,
        skipUserMessage: Boolean(action.skipUserMessage),
      });
    },
    [sendMessage],
  );

  useEffect(() => () => typingTimeoutRef.current && clearTimeout(typingTimeoutRef.current), []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  const suggestions = useMemo(
    () =>
      isAuthenticated
        ? [
            'Show me my upcoming appointments',
            'What viewings are booked?',
            "Give me Sophie Turner's conversation history",
            'Which offers are still pending?',
            "What's my lettings pipeline?",
          ]
        : [
            'Show me available rentals',
            'How do I book a viewing?',
            'Tell me about Aktonz',
            'Find me a property in Shoreditch',
          ],
    [isAuthenticated],

  );

  const renderMessageContent = useCallback(
    (message) => {
      if (message.type === 'text') {
        return message.text.split('\n').map((line, index) => (
          <p key={index} className={styles.textLine}>
            {line}
          </p>
        ));
      }

      if (message.type === 'listings') {
        return (
          <div className={styles.sectionContent}>
            {message.title ? <p className={styles.sectionTitle}>{message.title}</p> : null}
            <ul className={styles.listingList}>
              {message.listings.map((listing) => {
                const metaParts = [];
                if (listing.bedrooms) metaParts.push(`${listing.bedrooms} bed`);
                if (listing.transactionType === 'rent') metaParts.push('To let');
                if (listing.transactionType === 'sale') metaParts.push('For sale');
                if (listing.status) metaParts.push(listing.status);
                return (
                  <li key={listing.id} className={styles.listingItem}>
                    <div className={styles.listingHeader}>
                      <strong>{listing.title}</strong>
                      <span className={styles.listingPrice}>{listing.price}</span>
                    </div>
                    <div className={styles.listingAddress}>{listing.address}</div>
                    {metaParts.length ? (
                      <div className={styles.listingMeta}>{metaParts.join(' • ')}</div>
                    ) : null}
                    {listing.summary ? <p className={styles.listingSummary}>{listing.summary}</p> : null}
                    <div className={styles.listingActions}>
                      <button
                        type="button"
                        className={styles.listingActionButton}
                        onClick={() =>
                          handleAction({
                            id: `book-${listing.id}`,
                            label: `Book a viewing`,
                            value: `Book a viewing for ${listing.title}`,
                            metadata: { intent: 'bookViewing', property: listing },
                          })
                        }
                      >
                        <FaCalendarAlt aria-hidden="true" /> Book a viewing
                      </button>
                      {listing.link ? (
                        <a
                          className={styles.listingLink}
                          href={listing.link}
                          target={listing.link.startsWith('http') ? '_blank' : '_self'}
                          rel={listing.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                        >
                          View details
                        </a>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      }

      if (message.type === 'actions') {
        const renderActionIcon = (icon) => {
          if (icon === 'calendar') return <FaCalendarAlt aria-hidden="true" />;
          if (icon === 'bell') return <FaBell aria-hidden="true" />;
          if (icon === 'mail') return <FaEnvelope aria-hidden="true" />;
          if (icon === 'home') return <FaHome aria-hidden="true" />;
          return null;
        };

        return (
          <div className={styles.sectionContent}>
            {message.title ? <p className={styles.sectionTitle}>{message.title}</p> : null}
            <div className={styles.actionList}>
              {Array.isArray(message.actions)
                ? message.actions.map((action) => {
                    const iconElement = action.icon ? renderActionIcon(action.icon) : null;
                    return (
                      <button
                        key={action.id || action.label}
                        type="button"
                        className={styles.actionButton}
                        onClick={() => handleAction(action)}
                      >
                        {iconElement ? <span className={styles.actionIcon}>{iconElement}</span> : null}
                        <span className={styles.actionText}>
                          <span className={styles.actionLabel}>{action.label}</span>
                          {action.secondary ? (
                            <span className={styles.actionSecondary}>{action.secondary}</span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })
                : null}
            </div>
          </div>
        );
      }

      if (message.type === 'events') {
        return (
          <div className={styles.sectionContent}>
            {message.title ? <p className={styles.sectionTitle}>{message.title}</p> : null}
            <ul className={styles.eventList}>
              {message.items.map((item) => (
                <li key={item.id} className={styles.eventItem}>
                  <div className={styles.eventTime}>
                    <FaCalendarAlt aria-hidden="true" /> {item.time}
                  </div>
                  <div className={styles.eventTitle}>{item.title}</div>
                  {item.meta ? <div className={styles.eventMeta}>{item.meta}</div> : null}
                  {item.description ? <p className={styles.eventDescription}>{item.description}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        );
      }

      if (message.type === 'contacts') {
        return (
          <div className={styles.sectionContent}>
            <p className={styles.sectionTitle}>Active contacts</p>
            <ul className={styles.contactList}>
              {message.contacts.map((contact) => (
                <li key={contact.id} className={styles.contactItem}>
                  <div className={styles.contactHeader}>
                    <strong>{contact.name}</strong>
                    <span className={styles.contactStage}>{contact.stage}</span>
                  </div>
                  <div className={styles.contactFocus}>{contact.searchFocus}</div>
                  {contact.lastInteraction ? (
                    <div className={styles.contactMeta}>
                      Last spoke {describeRecency(new Date(contact.lastInteraction.date))} via {contact.lastInteraction.channel}
                    </div>
                  ) : null}
                  {contact.agent ? (
                    <div className={styles.contactMeta}>Handled by {contact.agent.name}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        );
      }

      if (message.type === 'timeline') {
        return (
          <div className={styles.sectionContent}>
            <div className={styles.timelineHeader}>
              <div>
                <strong>{message.contact.name}</strong>
                <div className={styles.timelineStage}>{message.contact.stage}</div>
              </div>
              {message.contact.agent ? (
                <div className={styles.timelineAgent}>Advisor: {message.contact.agent.name}</div>
              ) : null}
            </div>
            <div className={styles.timelineSummary}>{message.contact.summary}</div>
            <ul className={styles.timelineList}>
              {message.events.map((event, index) => (
                <li key={`${event.date}-${index}`} className={styles.timelineItem}>
                  <div className={styles.timelineTime}>{formatDateTime(event.date)}</div>
                  <div className={styles.timelineBody}>
                    <div className={styles.timelineMeta}>
                      {event.channel}
                      {event.agent ? ` • ${event.agent.name}` : ''}
                    </div>
                    <p>{event.summary}</p>
                  </div>
                </li>
              ))}
            </ul>
            {message.contact.activeRequirements?.length ? (
              <div className={styles.requirements}>
                <p>Key requirements:</p>
                <ul>
                  {message.contact.activeRequirements.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        );
      }

      if (message.type === 'team') {
        return (
          <div className={styles.sectionContent}>
            <p className={styles.sectionTitle}>Your Aktonz team</p>
            <ul className={styles.teamList}>
              {message.members.map((member) => (
                <li key={member.id} className={styles.teamItem}>
                  <div className={styles.teamHeader}>
                    <strong>{member.name}</strong>
                    <span className={styles.teamRole}>{member.role}</span>
                  </div>
                  {member.focus?.length ? (
                    <div className={styles.teamFocus}>{member.focus.join(' • ')}</div>
                  ) : null}
                  {member.email ? <div className={styles.teamMeta}>Email: {member.email}</div> : null}
                  {member.phone ? <div className={styles.teamMeta}>Phone: {member.phone}</div> : null}
                  {member.bio ? <p className={styles.teamBio}>{member.bio}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        );
      }

      return null;
    },
    [describeRecency, formatDateTime, handleAction],
  );

  const renderMessage = useCallback(
    (message) => {
      const richContent = ['listings', 'events', 'contacts', 'timeline', 'team', 'actions'].includes(message.type);
      return (
        <div
          className={`${styles.messageBubble} ${
            message.from === 'user' ? styles.messageUser : styles.messageBot
          } ${richContent ? styles.richContent : ''}`}
        >
          {renderMessageContent(message)}
        </div>
      );
    },
    [renderMessageContent],
  );

  useEffect(() => {
    if (isOpen) {
      setIsPanelRendered(true);
      if (panelVisibilityTimeoutRef.current) {
        clearTimeout(panelVisibilityTimeoutRef.current);
        panelVisibilityTimeoutRef.current = null;
      }
    } else if (isPanelRendered) {
      panelVisibilityTimeoutRef.current = setTimeout(() => {
        setIsPanelRendered(false);
        panelVisibilityTimeoutRef.current = null;
      }, 250);
    }

    return () => {
      if (panelVisibilityTimeoutRef.current) {
        clearTimeout(panelVisibilityTimeoutRef.current);
        panelVisibilityTimeoutRef.current = null;
      }
    };
  }, [isOpen, isPanelRendered]);

  return (
    <div className={styles.container} aria-live="polite">
      {isPanelRendered ? (
        <div
          id={panelId}
          className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}
          role="dialog"
          aria-modal="false"
          aria-label="Aktonz live support"
          aria-hidden={!isOpen}
        >
          <div className={styles.header}>
            <div className={styles.headerContent}>
              <div className={styles.headerTitle}>
                <FaRobot aria-hidden="true" />
                <span>Aktonz AI Support</span>
              </div>
              <div className={styles.headerStatus}>
                <span className={styles.statusDot} />
                Online now
              </div>
            </div>
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              disabled={!isOpen}
            >
              <FaTimes />
            </button>
          </div>

          <div className={styles.messages} ref={scrollRef}>
            {messages.map((message) => (
              <div key={message.id} className={styles.messageRow}>
                {renderMessage(message)}
              </div>
            ))}
            {isTyping ? (
              <div className={styles.messageRow}>
                <div className={`${styles.messageBubble} ${styles.messageBot}`}>
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} />
                </div>
              </div>
            ) : null}
          </div>

          <div className={styles.suggestions}>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className={styles.suggestion}
                onClick={() => sendMessage(suggestion)}
                disabled={!isOpen}
              >
                <FaCheckCircle aria-hidden="true" />
                {suggestion}
              </button>
            ))}
          </div>

          <div className={styles.inputArea}>
            <textarea
              className={styles.input}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={
                isAuthenticated
                  ? 'Ask about clients, viewings, offers or listings...'
                  : 'Ask about listings, viewings or Aktonz...'
              }

              onKeyDown={handleKeyDown}
              rows={2}
              aria-label="Message Aktonz support"
              disabled={!isOpen}
            />
            <button
              type="button"
              className={styles.sendButton}
              onClick={() => sendMessage()}
              aria-label="Send message"
              disabled={!isOpen || !inputValue.trim()}
            >
              <FaPaperPlane />
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className={`${styles.launcher} ${isOpen ? styles.launcherActive : ''}`}
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? 'Minimise Aktonz support chat' : 'Open Aktonz support chat'}
        aria-controls={panelId}
        aria-expanded={isOpen}
      >
        <FaComments aria-hidden="true" />
        <span className={styles.launcherLabel}>{isOpen ? 'Close chat' : 'Need help?'}</span>
      </button>
    </div>
  );
}
