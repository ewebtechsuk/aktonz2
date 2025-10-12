import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/BlockManagement.module.css';

export default function BlockManagement() {
  return (
    <main className={styles.page}>
      <Head>
        <title>Block Management Services | Aktonz</title>
        <meta
          name="description"
          content="Specialist block management for residential buildings across London, tailored by Aktonz."
        />
      </Head>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.kicker}>Aktonz Block Management</p>
          <h1>Taking care of every building, every resident, every day</h1>
          <p className={styles.heroText}>
            From boutique conversions to landmark developments, Aktonz keeps your
            communal spaces compliant, efficient and welcoming. Our London-based
            experts coordinate finance, maintenance and resident care so you can
            focus on long-term asset performance.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryAction} href="/contact">
              Book a consultation
            </Link>
            <Link className={styles.secondaryAction} href="/property-management">
              Explore property management
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.stats}>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>18k+</span>
          <span className={styles.statLabel}>homes under Aktonz care</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>£1.2bn</span>
          <span className={styles.statLabel}>service charge budgets managed</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>92%</span>
          <span className={styles.statLabel}>resident satisfaction in 2024</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>24/7</span>
          <span className={styles.statLabel}>emergency response coverage</span>
        </div>
      </section>

      <section className={styles.pillars}>
        <div className={styles.pillarsContent}>
          <h2>Block management built for modern living</h2>
          <p>
            Aktonz brings together chartered surveyors, financial controllers and
            resident liaison specialists who understand the pressure points in
            multi-unit buildings. Our transparent reporting and proactive
            planning keep service charges predictable and buildings future ready.
          </p>
        </div>
        <div className={styles.pillarsGrid}>
          <article className={styles.pillar}>
            <h3>Financial stewardship</h3>
            <p>
              Annual budgeting, cashflow forecasting and reserve fund strategy
              delivered by our in-house client accounting team, with digital
              dashboards for directors and freeholders.
            </p>
          </article>
          <article className={styles.pillar}>
            <h3>Compliance guardianship</h3>
            <p>
              Fire, lift and water safety programmes run to rigorous schedules,
              combined with supplier audits and document tracking that keep every
              building inspection-ready.
            </p>
          </article>
          <article className={styles.pillar}>
            <h3>Resident experience</h3>
            <p>
              Dedicated relationship managers and a 24/7 helpdesk resolve issues
              quickly, keeping communication open for RTM, RMC and investor-led
              blocks alike.
            </p>
          </article>
        </div>
      </section>

      <section className={styles.services}>
        <div className={styles.servicesIntro}>
          <h2>What&apos;s included in every Aktonz block management plan</h2>
          <p>
            Every development is different, but our core offer ensures vital
            responsibilities are covered from day one.
          </p>
        </div>
        <div className={styles.serviceGrid}>
          <article className={styles.serviceCard}>
            <h3>Mobilisation</h3>
            <ul>
              <li>Director onboarding workshop</li>
              <li>Contracts, warranties and H&S audit</li>
              <li>Service charge health check</li>
            </ul>
          </article>
          <article className={styles.serviceCard}>
            <h3>Operations</h3>
            <ul>
              <li>Planned and reactive maintenance scheduling</li>
              <li>Approved contractor procurement and oversight</li>
              <li>Site inspections with photographic reporting</li>
            </ul>
          </article>
          <article className={styles.serviceCard}>
            <h3>Financial management</h3>
            <ul>
              <li>Service charge billing and arrears recovery</li>
              <li>Reserve fund investment planning</li>
              <li>Quarterly financial statements</li>
            </ul>
          </article>
          <article className={styles.serviceCard}>
            <h3>Compliance & governance</h3>
            <ul>
              <li>Fire and building safety case management</li>
              <li>Risk assessment programme oversight</li>
              <li>Company secretarial support</li>
            </ul>
          </article>
        </div>
      </section>

      <section className={styles.highlightStrip}>
        <div className={styles.highlightContent}>
          <h2>Specialist support when you need it most</h2>
          <p>
            Major works? Insurance renewals? Building safety fund claims? Our
            project team brings the technical knowledge and partner network to
            navigate complex challenges without disrupting residents.
          </p>
          <Link className={styles.stripAction} href="/contact">
            Talk to our block specialists
          </Link>
        </div>
      </section>

      <section className={styles.timeline}>
        <div className={styles.timelineIntro}>
          <h2>Your onboarding journey with Aktonz</h2>
          <p>
            Clear milestones keep everyone aligned. Most buildings transition to
            Aktonz within 60 days.
          </p>
        </div>
        <ol className={styles.timelineSteps}>
          <li>
            <h3>Discovery</h3>
            <p>
              We review legal documents, current contracts and service charge
              status while agreeing success metrics with stakeholders.
            </p>
          </li>
          <li>
            <h3>Mobilise</h3>
            <p>
              Supplier novations, statutory testing schedules and resident
              communications prepared in collaboration with directors.
            </p>
          </li>
          <li>
            <h3>Go live</h3>
            <p>
              Dedicated property manager on site, welcome packs issued and
              digital portal access provided to residents and directors.
            </p>
          </li>
          <li>
            <h3>Review</h3>
            <p>
              90-day service review to evaluate KPIs, feedback and upcoming
              investment priorities.
            </p>
          </li>
        </ol>
      </section>

      <section className={styles.testimonial}>
        <div className={styles.testimonialContent}>
          <p className={styles.quote}>
            “Aktonz transformed our estate&apos;s maintenance and communication in
            a single quarter. Directors finally have the data we need to plan
            ahead.”
          </p>
          <p className={styles.quoteSource}>Chair, Riverside Wharf RMC</p>
        </div>
      </section>

      <section className={styles.partners}>
        <h2>Trusted by London&apos;s leading developments</h2>
        <div className={styles.partnerGrid}>
          <span className={styles.partnerBadge}>Skyline Wharf</span>
          <span className={styles.partnerBadge}>Canal Quarter</span>
          <span className={styles.partnerBadge}>Harbour Gate</span>
          <span className={styles.partnerBadge}>East Park Residences</span>
          <span className={styles.partnerBadge}>The Colonnades</span>
          <span className={styles.partnerBadge}>Greenway Square</span>
        </div>
      </section>

      <section className={styles.contactCta}>
        <div className={styles.contactContent}>
          <h2>Ready to elevate your block management?</h2>
          <p>
            Call us on <a href="tel:+442030000000">020 3000 0000</a> or share
            your building details and we&apos;ll create a tailored proposal within
            two working days.
          </p>
        </div>
        <div className={styles.contactActions}>
          <Link className={styles.primaryAction} href="/contact">
            Arrange a call
          </Link>
          <Link className={styles.secondaryAction} href="/valuation">
            Request a building appraisal
          </Link>
        </div>
      </section>
    </main>
  );
}
