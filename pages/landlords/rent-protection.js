import Head from 'next/head';
import styles from '../../styles/RentProtection.module.css';

const terms = [
  {
    title: 'Eligibility',
    description:
      'Available for properties let and managed through Aktonz with tenants who pass our comprehensive referencing checks.',
  },
  {
    title: 'Cover Limits',
    description:
      'Legal expenses cover up to £100,000 per claim including eviction and repossession proceedings.',
  },
  {
    title: 'Rent Protection',
    description:
      '100% of monthly rent paid until vacant possession is obtained, plus up to two months of 50% rent while we re-let.',
  },
  {
    title: 'Policy Conditions',
    description:
      'Claims must be notified within 30 days of arrears. Terms, exclusions and excesses apply – please contact us for the full policy wording.',
  },
];

const exploreLinks = [
  {
    title: 'Landlord services',
    description: 'Discover how our lettings experts can manage every aspect of your tenancy.',
    href: '/landlords',
  },
  {
    title: 'Landlord advice',
    description: 'Guides covering compliance updates, lettings regulations and market insights.',
    href: '/landlords',
  },
  {
    title: 'Landlord tools',
    description: 'Book a rental valuation, request statements and manage documents in one place.',
    href: '/account',
  },
];

export default function RentProtection() {
  return (
    <main className={styles.page}>
      <Head>
        <title>Landlord Rent Protection &amp; Legal Expenses Service | Aktonz</title>
        <meta
          name="description"
          content="Protect your rental income with Aktonz rent protection and legal expenses service, covering missed rent, evictions and legal costs."
        />
      </Head>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>Landlord services</p>
          <h1>Landlord Rent Protection &amp; Legal Expenses Service</h1>
          <p>
            Safeguard your rental income with market-leading cover for rent arrears, legal fees and possession proceedings – all supported by
            our experienced lettings specialists.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href="/contact">
              Speak to our team
            </a>
            <a className={styles.secondaryButton} href="/valuation">
              Request a valuation
            </a>
          </div>
        </div>
        <div className={styles.heroImage} aria-hidden="true" />
      </section>

      <section className={styles.keyBenefits}>
        <div className={styles.keyBenefitsContent}>
          <h2>Key Benefits of Landlord Rent Protection &amp; Legal Expenses Service</h2>
          <p>
            Our comprehensive cover provides peace of mind that your rental income is protected, even if your tenants default. Every policy is
            backed by experts who specialise in landlord legislation.
          </p>
          <ul className={styles.benefitsList}>
            <li>
              <span className={styles.benefitIcon}>✓</span>
              <div>
                <h3>Rent paid until vacant possession</h3>
                <p>Receive 100% of monthly rent until your property is legally recovered from defaulting tenants.</p>
              </div>
            </li>
            <li>
              <span className={styles.benefitIcon}>✓</span>
              <div>
                <h3>Legal fees covered</h3>
                <p>Property litigation specialists manage the process with legal expenses covered up to £100,000 per claim.</p>
              </div>
            </li>
            <li>
              <span className={styles.benefitIcon}>✓</span>
              <div>
                <h3>Support after possession</h3>
                <p>Continue to receive 50% of the monthly rent for up to two months while we secure new tenants.</p>
              </div>
            </li>
            <li>
              <span className={styles.benefitIcon}>✓</span>
              <div>
                <h3>No excess to pay</h3>
                <p>Claims are paid without an excess when tenants have been referenced through Aktonz.</p>
              </div>
            </li>
          </ul>
        </div>
        <aside className={styles.serviceCard}>
          <div className={styles.serviceBadge}>RP</div>
          <h3>Complete cover, seamless service</h3>
          <p>
            Combine rent protection with our fully managed lettings package for end-to-end support including marketing, compliance tracking and
            maintenance coordination.
          </p>
          <a href="/landlords">Explore landlord services</a>
        </aside>
      </section>

      <section className={styles.infoGrid}>
        <article className={styles.infoPanel}>
          <div className={styles.panelImage}>
            <img
              src="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&amp;fit=crop&amp;w=900&amp;q=80"
              alt="Landlord reviewing documents with an adviser"
              loading="lazy"
            />
          </div>
          <div className={styles.infoContent}>
            <h2>Why take out Rent Protection</h2>
            <p>
              A rental property is a significant investment. Rent protection ensures that unexpected tenant difficulties don&apos;t disrupt your
              cash flow or compromise your ability to meet mortgage payments.
            </p>
            <ul>
              <li>Protect monthly income in the event of tenant arrears or disputes.</li>
              <li>Keep mortgage repayments and overheads on track even during void periods.</li>
              <li>Rely on specialists to handle the legal process quickly and professionally.</li>
            </ul>
          </div>
        </article>
        <article className={styles.infoPanel}>
          <div className={styles.panelImage}>
            <img
              src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&amp;fit=crop&amp;w=900&amp;q=80"
              alt="Aktonz team supporting landlords"
              loading="lazy"
            />
          </div>
          <div className={styles.infoContent}>
            <h2>Why choose Aktonz</h2>
            <p>
              From referencing to rent collection, our lettings experts manage the entire tenancy. When issues arise, you have a dedicated
              property manager and legal partners ready to act.
            </p>
            <ul>
              <li>Fast rental payments and transparent online statements.</li>
              <li>Regular property inspections with detailed reports.</li>
              <li>Dedicated legal advisors coordinating possession proceedings.</li>
            </ul>
          </div>
        </article>
      </section>

      <section className={styles.terms}>
        <h2>Terms &amp; Conditions</h2>
        <div className={styles.termsCard}>
          <p>
            The Landlord Rent Protection &amp; Legal Expenses Service is underwritten by a leading insurer. The summary below highlights the key
            points – please speak to your property manager for full details.
          </p>
          <ul>
            {terms.map((term) => (
              <li key={term.title}>
                <h3>{term.title}</h3>
                <p>{term.description}</p>
              </li>
            ))}
          </ul>
          <p className={styles.disclaimer}>
            This information is intended as a guide only. Policy terms may vary depending on your tenancy agreement and level of management
            selected.
          </p>
        </div>
      </section>

      <section className={styles.explore}>
        <h2>Explore Aktonz</h2>
        <div className={styles.exploreGrid}>
          {exploreLinks.map((link) => (
            <a key={link.title} href={link.href} className={styles.exploreCard}>
              <h3>{link.title}</h3>
              <p>{link.description}</p>
              <span>Learn more →</span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
