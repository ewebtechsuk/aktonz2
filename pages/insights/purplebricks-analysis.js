import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/PurplebricksAnalysis.module.css';

const businessHighlights = [
  {
    title: 'Digital-first onboarding',
    description:
      'Prominent calls to action lead sellers to a seamless valuation journey and let them progress the sale online without waiting for branch appointments.',
  },
  {
    title: 'Local expertise with national coverage',
    description:
      'Messaging balances the convenience of a digital platform with reassurance that experienced local agents understand each neighbourhood.',
  },
  {
    title: 'Transparent, fixed-fee pricing',
    description:
      'Simple pricing tables and flexible payment options make it easy to compare costs with traditional agents and commit quickly.',
  },
  {
    title: 'Self-service toolkit with add-ons',
    description:
      'Customers can mix core services such as photography and listings with optional upgrades like hosted viewings or premium marketing.',
  },
  {
    title: 'Social proof and performance metrics',
    description:
      'Large headline numbers covering sales completed and five-star reviews build trust and reduce perceived risk for sellers.',
  },
  {
    title: 'Integrated ancillary services',
    description:
      'Mortgage, energy and moving support are offered within the journey, keeping customers in the ecosystem for longer.',
  },
  {
    title: 'Content-led nurturing',
    description:
      'Guides, news and featured properties keep prospects engaged so they continue to return until they are ready to instruct.',
  },
];

const experiencePillars = [
  {
    title: 'Empower with guided self-service',
    description:
      'Deliver a digital-first seller experience that feels supported at every step while allowing clients to move at their own pace.',
    actions: [
      'Launch a valuation request flow that surfaces the next best action, from uploading photos to booking viewings.',
      'Give sellers a dashboard with nudges, notifications and contextual help from Aktonz experts.',
    ],
  },
  {
    title: 'Balance local expertise and scale',
    description:
      'Demonstrate Aktonz’s neighbourhood knowledge while showcasing the reach of the wider network.',
    actions: [
      'Publish coverage maps, agent bios and testimonials tailored to each local landing page.',
      'Surface market data such as recent sales, price trends and buyer demand indicators within the seller workspace.',
    ],
  },
  {
    title: 'Make pricing frictionless',
    description:
      'Adopt transparent, fixed-fee packages with comparison tools that highlight savings without overwhelming choice.',
    actions: [
      'Offer upfront, flexi-pay and completion-based payment options so sellers can pick what works for their cash flow.',
      'Bundle optional add-ons clearly to encourage upsell while keeping the core proposition easy to understand.',
    ],
  },
  {
    title: 'Create a services marketplace',
    description:
      'Extend the relationship beyond the sale by integrating trusted partners directly into the Aktonz journey.',
    actions: [
      'Embed mortgages, conveyancing, insurance and utilities switching offers with transparent revenue tracking.',
      'Centralise partner performance dashboards to understand conversion and retention impact.',
    ],
  },
  {
    title: 'Invest in trust signals and education',
    description:
      'Keep confidence high with proof points and always-on content that answers seller, buyer and landlord questions.',
    actions: [
      'Showcase review widgets, case studies and success metrics prominently across the journey.',
      'Maintain a dynamic insight library of guides, webinars and market updates personalised to user intent.',
    ],
  },
];

const productFeatures = [
  {
    title: 'Valuation wizard',
    description:
      'Postcode lookup, lead capture and automated scheduling for virtual or in-person valuations feed straight into CRM workflows.',
  },
  {
    title: 'Seller workspace',
    description:
      'A central hub with task lists, document storage, messaging and live performance analytics keeps sellers on track.',
  },
  {
    title: 'Pricing calculator',
    description:
      'Interactive comparisons show the savings of Aktonz’s fixed fees versus average high street commission rates.',
  },
  {
    title: 'Add-on marketplace',
    description:
      'Toggle extras such as hosted viewings, premium photography, staging and featured listings with transparent pricing.',
  },
  {
    title: 'Local agent finder',
    description:
      'Agent biographies, service areas and customer ratings humanise the online journey and build trust.',
  },
  {
    title: 'Integrated services dashboard',
    description:
      'Aggregated mortgage offers, energy and broadband deals plus conveyancing progress updates extend lifetime value.',
  },
  {
    title: 'Insight library',
    description:
      'Filterable guides aligned to seller, landlord and buyer journeys capture marketing-qualified leads with gated downloads.',
  },
];

const roadmap = [
  {
    phase: 'Discovery (0–4 weeks)',
    summary:
      'Clarify the MVP seller journey and technical foundations before investing in new tooling.',
    actions: [
      'Audit current Aktonz capabilities, CRM connections and data sources.',
      'Define seller personas, jobs-to-be-done and conversion baselines.',
      'Map the ideal valuation-to-instruction flow and success metrics.',
    ],
  },
  {
    phase: 'MVP build (4–12 weeks)',
    summary:
      'Deliver the core digital experience quickly with feedback loops from early adopters.',
    actions: [
      'Launch the valuation funnel, seller workspace, pricing calculator and starter content hub.',
      'Integrate payment providers for fixed-fee packages and connect review platforms for social proof.',
      'Instrument analytics to measure valuation drop-off and onboarding completion.',
    ],
  },
  {
    phase: 'Ecosystem expansion (12–24 weeks)',
    summary:
      'Bring partner services online and enhance localisation to drive revenue beyond the core fee.',
    actions: [
      'Onboard mortgage, utilities, insurance and conveyancing partners with shared attribution.',
      'Roll out localised landing pages with neighbourhood stats and targeted campaigns.',
      'Enhance dashboards with cross-sell tracking and cohort analysis.',
    ],
  },
  {
    phase: 'Optimisation (24+ weeks)',
    summary:
      'Use data and automation to maximise conversion, retention and advocacy.',
    actions: [
      'Introduce predictive pricing suggestions and automated nurture sequences.',
      'Launch referral incentives and continuous CRO testing across funnels.',
      'Expand partner marketplace inventory based on performance insights.',
    ],
  },
];

const kpis = [
  {
    title: 'Valuation to instruction conversion',
    description:
      'Track conversion rates across cohorts, identifying where sellers stall and how guided workflows improve completion.',
  },
  {
    title: 'Average revenue per seller',
    description:
      'Measure fixed-fee uptake alongside add-ons and partner commissions to understand lifetime value.',
  },
  {
    title: 'Speed metrics',
    description:
      'Monitor time to list, days on market and time to offer acceptance to benchmark operational excellence.',
  },
  {
    title: 'Customer satisfaction and advocacy',
    description:
      'Combine NPS, review volume and qualitative feedback to validate trust-building investments.',
  },
  {
    title: 'Partner service adoption',
    description:
      'Analyse cross-sell rates for mortgages, utilities and conveyancing to inform marketplace optimisation.',
  },
  {
    title: 'Content engagement and lead capture',
    description:
      'Review guide downloads, webinar attendance and returning visitor rates to fine-tune nurturing programmes.',
  },
];

const heroHighlights = [
  'Digitise onboarding with guided seller workspaces.',
  'Humanise scale by spotlighting local experts and proof points.',
  'Extend revenue with an integrated services marketplace.',
];

export default function PurplebricksAnalysis() {
  return (
    <>
      <Head>
        <title>Purplebricks Online Estate Agent Analysis | Aktonz Insights</title>
        <meta
          name="description"
          content="Break down the Purplebricks playbook and see how Aktonz can translate digital-first estate agency tactics into a guided seller experience, partner marketplace and measurable growth."
        />
      </Head>
      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Aktonz insights</span>
          <h1 className={styles.heroTitle}>Applying Purplebricks&rsquo; playbook to Aktonz</h1>
          <p className={styles.heroLead}>
            A structured roadmap for translating Purplebricks&rsquo; digital-first estate agency model into Aktonz product enhancements
            that accelerate seller conversion, boost trust and unlock new revenue streams.
          </p>
          <ul className={styles.heroHighlights}>
            {heroHighlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>1. Purplebricks business model highlights</h2>
            <p>
              Core elements of the Purplebricks proposition that resonate with sellers and keep them engaged from valuation
              request to completion.
            </p>
          </div>
          <div className={styles.grid}>
            {businessHighlights.map((item) => (
              <article key={item.title} className={styles.card}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.altSection}`}>
          <div className={styles.sectionHeader}>
            <h2>2. Experience pillars for Aktonz</h2>
            <p>
              Translate the Purplebricks approach into five experience pillars that guide product, marketing and service design
              decisions across the Aktonz platform.
            </p>
          </div>
          <div className={styles.pillarGrid}>
            {experiencePillars.map((pillar) => (
              <article key={pillar.title} className={styles.pillarCard}>
                <header>
                  <h3>{pillar.title}</h3>
                  <p>{pillar.description}</p>
                </header>
                <ul>
                  {pillar.actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>3. Suggested product features</h2>
            <p>
              Prioritised feature concepts to bring the pillars to life, covering the full seller lifecycle from valuation to
              post-completion services.
            </p>
          </div>
          <div className={styles.featureGrid}>
            {productFeatures.map((feature) => (
              <article key={feature.title} className={styles.featureCard}>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.altSection}`}>
          <div className={styles.sectionHeader}>
            <h2>4. Implementation roadmap</h2>
            <p>
              Phase the delivery to balance speed with sustainable impact, capturing quick wins while laying foundations for
              long-term growth.
            </p>
          </div>
          <ol className={styles.roadmapList}>
            {roadmap.map((phase) => (
              <li key={phase.phase} className={styles.roadmapCard}>
                <div>
                  <h3>{phase.phase}</h3>
                  <p>{phase.summary}</p>
                </div>
                <ul>
                  {phase.actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>5. KPIs to track</h2>
            <p>
              Instrument measurement early so every release can be tied back to commercial impact, customer satisfaction and
              operational efficiency.
            </p>
          </div>
          <div className={styles.kpiGrid}>
            {kpis.map((kpi) => (
              <article key={kpi.title} className={styles.kpiCard}>
                <h3>{kpi.title}</h3>
                <p>{kpi.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.ctaSection}>
          <div className={styles.ctaContent}>
            <h2>Ready to activate the Aktonz seller platform?</h2>
            <p>
              Our product and growth teams can partner with you to turn this roadmap into shipped experiences, validated by
              customer feedback and measurable KPIs.
            </p>
            <div className={styles.ctaActions}>
              <Link href="/contact" className={styles.primaryCta}>
                Speak to the product team
              </Link>
              <Link href="/valuation" className={styles.secondaryCta}>
                Launch valuation journey
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
