import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/FoxtonsComparison.module.css';

const foxtonsHighlights = [
  {
    title: 'Enhanced property search and streamlined navigation',
    description:
      'Foxtons rebuilt its property search journeys so buyers, renters and landlords can find listings more quickly and follow tailored guidance through each step.',
    source: 'foxtons.co.uk',
  },
  {
    title: 'Improved content and intuitive functionality',
    description:
      'Clearer language and proactive help content answer common questions before a visitor needs to speak to an agent.',
    source: 'foxtons.co.uk',
  },
  {
    title: 'My Foxtons portal for sellers and landlords',
    description:
      'A central dashboard surfaces marketing progress, key documents and finance tracking so clients can monitor campaigns in one place.',
    source: 'foxtons.co.uk',
  },
  {
    title: 'Applicant benefits and priority alerts',
    description:
      'Registered buyers and tenants see new instructions first, receive price-drop alerts and get faster agent follow-up.',
    source: 'foxtons.co.uk',
  },
  {
    title: 'Interactive map and real-time dashboards',
    description:
      'Foxtons complements search results with map-based discovery, instant listing updates, virtual tours and in-portal messaging.',
    source: 'rentround.com',
  },
];

const uxImprovements = [
  {
    title: 'Prioritise mobile-first, accessible design',
    summary:
      'Design for smaller screens first, then scale up. Support gestures, large tap targets and flexible layouts while meeting WCAG 2.2 accessibility standards.',
    bullets: [
      'Responsive layouts that adapt components, photography and CTAs to any device.',
      'Accessibility foundations: semantic HTML, keyboard journeys, ARIA labelling, colour contrast tools, dark mode and multilingual options.',
      'Performance enhancements such as CDNs, Core Web Vitals monitoring, lazy-loaded media and optimised imagery to keep load times under two seconds.',
    ],
  },
  {
    title: 'Make navigation intuitive',
    summary:
      'Guide visitors with logical information architecture, persistent filters and progressive disclosure.',
    bullets: [
      'Global navigation with clear entry points for buying, renting, selling and letting alongside contextual breadcrumbs.',
      'Sticky search bars and filter drawers that retain selections when people view details or return to results.',
      'Inline tooltips, glossaries and explainer modals for complex terms such as leasehold or Section 21 notices.',
    ],
  },
];

const discoveryFeatures = [
  {
    title: 'AI-powered property search with granular filters',
    bullets: [
      'Natural-language search, predictive suggestions and saved intent profiles that learn from behaviour.',
      'Filters for EPC score, sustainability upgrades, build year, pet policies, outdoor space, parking, broadband speed and more.',
      'Voice search, GPS-powered “near me” mode and multi-location comparisons for commuters or multi-city investors.',
    ],
  },
  {
    title: 'Interactive maps and neighbourhood insights',
    bullets: [
      'Layer property results with schools, crime rates, transport links, amenities, flood risk and green space.',
      'Draw bespoke search polygons, compare historical price trends and surface commute-time heatmaps.',
      'Overlay walkability, cycling scores and sustainability points of interest to support eco-conscious movers.',
    ],
  },
  {
    title: 'Immersive property storytelling',
    bullets: [
      'High-impact photography, drone fly-throughs, narrated video tours and 360° walk-throughs for every listing.',
      'Interactive floor plans that connect media, room dimensions and upgrade suggestions.',
      'Augmented-reality staging for furniture placement, renovation previews and off-plan visualisations.',
    ],
  },
  {
    title: 'Rich data and sustainability signals',
    bullets: [
      'Display EPC certificates, estimated running costs, carbon impact and grant opportunities alongside each property.',
      'Show comparable sales, rental yields, price trajectories and confidence ranges for AI-driven forecasts.',
      'Highlight eco-score badges to celebrate low-impact homes and recommend upgrades for others.',
    ],
  },
];

const accountFeatures = [
  {
    title: 'Personalised buyer and tenant journeys',
    bullets: [
      'Unified dashboards for saved searches, shortlisted homes, scheduled viewings and document management.',
      'AI-powered recommendations that adjust to lifestyle goals, budget guardrails and search refinements.',
      'Calendar sync, mortgage pre-qualification uploads, proof-of-funds storage and e-signature workflows.',
    ],
  },
  {
    title: 'Seller and landlord intelligence',
    bullets: [
      'Real-time marketing analytics covering impressions, enquiries, viewings, offer velocity and engagement trends.',
      'Actionable insights that suggest pricing adjustments, staging tips or marketing upgrades based on benchmarks.',
      'Collaboration hub for messaging, appointment control, compliance reminders and comparative market analysis tools.',
    ],
  },
  {
    title: 'Community and transparency',
    bullets: [
      'Verified reviews of properties, neighbourhoods and agents, including sentiment on noise, parking and amenities.',
      'Clear breakdowns of fees, service tiers and timelines for renting, selling or property management.',
      'Spaces for user-generated stories, post-move photos and testimonials that build social proof.',
    ],
  },
];

const marketingAndSupport = [
  {
    title: 'Intelligent content and local SEO',
    bullets: [
      'Editorial calendar of market updates, how-to guides, hyper-local lifestyle pieces and school spotlights.',
      'Schema-enriched FAQs and interactive tools to win placement in AI Overviews and answer engines.',
      'Neighbourhood landing pages with geo-targeted SEO, Google Business Profile optimisation and newsletter capture.',
    ],
  },
  {
    title: 'Conversational AI and real-time support',
    bullets: [
      'Chatbots that triage queries, qualify leads, schedule viewings and hand off to agents with full context.',
      'Live chat, video consultations and instant virtual tour booking for global or time-poor clients.',
      'Automated nurture sequences that react to browsing behaviour and prompt timely follow-ups.',
    ],
  },
  {
    title: 'Social and multimedia amplification',
    bullets: [
      'One-click social sharing with prebuilt captions, hashtags and trackable short links.',
      'Short-form vertical video reels, webinar archives and market briefings embedded across the site.',
      'Newsletter and webinar sign-ups that sync to CRM segments for targeted campaigns.',
    ],
  },
  {
    title: 'Security and trust',
    bullets: [
      'Full-stack encryption, GDPR-compliant consent, secure payment rails and two-factor authentication for accounts.',
      'Role-based permissions so vendors can safely share financial statements with accountants or co-owners.',
      'Transparent privacy dashboards that let users control notification frequency and data retention.',
    ],
  },
];

const innovationIdeas = [
  {
    title: 'Augmented-reality styling studio',
    description:
      'Let movers preview décor updates, experiment with sustainable materials or visualise furniture layouts within minutes.',
  },
  {
    title: 'AI-driven price and demand forecasting',
    description:
      'Blend historical comparables with macro indicators to surface confidence ranges and guidance on the best time to transact.',
  },
  {
    title: 'Mortgage marketplace integration',
    description:
      'Offer instant pre-approval comparisons from trusted lenders so buyers can act quickly without leaving your platform.',
  },
  {
    title: 'Online auctions and instant offers',
    description:
      'Provide transparent, time-boxed bidding rooms and optional institutional offers to give sellers multiple sale routes.',
  },
  {
    title: 'Blockchain-backed transaction tracking',
    description:
      'Create tamper-proof milestones for conveyancing, compliance checks and fund transfers to reassure every stakeholder.',
  },
];

const renderFeatureList = (items, variant = 'list') => {
  if (variant === 'cards') {
    return (
      <div className={styles.cardGrid}>
        {items.map((item) => (
          <article key={item.title} className={styles.card}>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            {item.source && (
              <p className={styles.source}>
                Source: <span>{item.source}</span>
              </p>
            )}
          </article>
        ))}
      </div>
    );
  }

  return (
    <ul className={styles.featureList}>
      {items.map((item) => (
        <li key={item.title}>
          <h3>{item.title}</h3>
          {item.summary && <p>{item.summary}</p>}
          {item.description && <p>{item.description}</p>}
          {Array.isArray(item.bullets) && item.bullets.length > 0 && (
            <ul className={styles.bulletList}>
              {item.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
};

export default function FoxtonsComparisonPage() {
  return (
    <>
      <Head>
        <title>How to Outperform Foxtons Online | Aktonz</title>
        <meta
          name="description"
          content="Deep dive into Foxtons' 2025 relaunch and the product, UX and data innovations Aktonz can deploy to deliver a standout real-estate experience."
        />
      </Head>
      <div className={styles.page}>
        <header className={styles.hero}>
          <p className={styles.tagline}>Competitive insight</p>
          <h1>Build a real-estate experience that surpasses Foxtons</h1>
          <p className={styles.intro}>
            Foxtons relaunched its website and investor portal in March 2025 with a suite of buyer,
            seller and landlord tools. Use this blueprint to understand where Foxtons excels—and how
            Aktonz can deliver an even smarter, more transparent journey.
          </p>
          <div className={styles.heroActions}>
            <Link href="#opportunities" className={styles.primaryAction}>
              Explore opportunity roadmap
            </Link>
            <Link href="#innovation" className={styles.secondaryAction}>
              Jump to innovation ideas
            </Link>
          </div>
        </header>

        <section className={styles.section} aria-labelledby="foxtons-overview">
          <div className={styles.sectionHeader}>
            <h2 id="foxtons-overview">Foxtons 2025 redesign: key strengths</h2>
            <p>
              Recognise the pillars that Foxtons already offers so our roadmap focuses on meaningful
              differentiation.
            </p>
          </div>
          {renderFeatureList(foxtonsHighlights, 'cards')}
        </section>

        <section className={styles.section} id="opportunities" aria-labelledby="ux-foundations">
          <div className={styles.sectionHeader}>
            <h2 id="ux-foundations">Essential user-experience improvements</h2>
            <p>
              Start with a resilient foundation that prioritises mobile usage, accessibility and
              clarity so every visitor feels confident engaging with Aktonz.
            </p>
          </div>
          {renderFeatureList(uxImprovements)}
        </section>

        <section className={styles.section} aria-labelledby="advanced-discovery">
          <div className={styles.sectionHeader}>
            <h2 id="advanced-discovery">Advanced search and discovery features</h2>
            <p>
              Deliver tooling that uncovers the right property faster and surfaces the context buyers
              crave but Foxtons still lacks.
            </p>
          </div>
          {renderFeatureList(discoveryFeatures)}
        </section>

        <section className={styles.section} aria-labelledby="personalised-journeys">
          <div className={styles.sectionHeader}>
            <h2 id="personalised-journeys">Personalised accounts and engagement</h2>
            <p>
              Combine dashboards, automation and transparency to help applicants, sellers and
              landlords manage every milestone online.
            </p>
          </div>
          {renderFeatureList(accountFeatures)}
        </section>

        <section className={styles.section} aria-labelledby="marketing-support">
          <div className={styles.sectionHeader}>
            <h2 id="marketing-support">Marketing, support and trust accelerators</h2>
            <p>
              Keep Aktonz top of mind with ongoing content, responsive support and enterprise-grade
              security practices.
            </p>
          </div>
          {renderFeatureList(marketingAndSupport)}
        </section>

        <section className={styles.section} id="innovation" aria-labelledby="innovation-heading">
          <div className={styles.sectionHeader}>
            <h2 id="innovation-heading">Innovation ideas to lead the market</h2>
            <p>
              Layer emerging technology on top of the core roadmap to create signature moments that
              signal Aktonz is the most future-ready agency.
            </p>
          </div>
          <div className={styles.cardGrid}>
            {innovationIdeas.map((idea) => (
              <article key={idea.title} className={styles.ideaCard}>
                <h3>{idea.title}</h3>
                <p>{idea.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="conclusion">
          <div className={styles.callout}>
            <h2 id="conclusion">Turning the roadmap into delivery</h2>
            <p>
              By pairing human expertise with data-led personalisation, Aktonz can craft a platform
              that is more insightful, responsive and trusted than Foxtons. Prioritise the foundational
              UX upgrades, then iterate quickly on AI, sustainability and transparency features to
              maintain a decisive competitive edge.
            </p>
            <Link href="/contact" className={styles.primaryAction}>
              Book a strategy session
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
