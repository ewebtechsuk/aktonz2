import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaComments,
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

  return {
    company: supportData.company,
    team,
    agents: Array.from(agentMap.values()),
    listings,
    contacts,
    appointments,
    viewings,
    offers,
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

  const requireAccountAccess = (topic) => {
    replies.push({
      from: 'bot',
      type: 'text',
      text: `Sign in to your Aktonz account to view ${topic}. Once you're logged in I can surface your conversations, appointments, offers and tenancy updates here in the chat.`,
    });
  };

  if (!isAuthenticated) {
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
        items: saleOffers.map((offer) => ({
          id: offer.id,
          title: `${offer.contact?.name || 'Buyer'} — ${offer.amount}`,
          time: formatters.formatDateTime(offer.date),
          description: `${offer.property?.title || 'Property'} • ${offer.status}`,
          meta: offer.notes,
        })),
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
        items: rentalOffers.map((offer) => ({
          id: offer.id,
          title: `${offer.contact?.name || 'Client'} — ${offer.amount}`,
          time: formatters.formatDateTime(offer.date),
          description: `${offer.property?.title || 'Property'} • ${offer.status}`,
          meta: offer.notes,
        })),
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
        items: knowledge.offers.map((offer) => ({
          id: offer.id,
          title: `${offer.contact?.name || 'Client'} — ${offer.amount}`,
          time: formatters.formatDateTime(offer.date),
          description: `${offer.property?.title || 'Property'} • ${offer.status}`,
          meta: offer.notes,
        })),
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
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);
  const typingTimeoutRef = useRef();
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

  const formatDateTime = useCallback((value) => dateTimeFormatter.format(new Date(value)), [dateTimeFormatter]);
  const formatDate = useCallback((value) => dateFormatter.format(new Date(value)), [dateFormatter]);

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

  const sendMessage = useCallback(
    (providedText) => {
      const text = (typeof providedText === 'string' ? providedText : inputValue).trim();
      if (!text) return;

      if (!isOpen) {
        setIsOpen(true);
      }

      const userMessage = {
        id: `user-${Date.now()}`,
        from: 'user',
        type: 'text',
        text,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue('');
      setIsTyping(true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        const replies = buildReplies(text).map((reply, index) => ({
          ...reply,
          from: 'bot',
          id: `${reply.type}-${Date.now()}-${index}`,
        }));
        setMessages((prev) => [...prev, ...replies]);
        setIsTyping(false);
      }, 450);
    },
    [inputValue, buildReplies, isOpen],
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
                  </li>
                );
              })}
            </ul>
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
    [describeRecency, formatDateTime],
  );

  const renderMessage = useCallback(
    (message) => {
      const richContent = ['listings', 'events', 'contacts', 'timeline', 'team'].includes(message.type);
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

  return (
    <div className={styles.container} aria-live="polite">
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
