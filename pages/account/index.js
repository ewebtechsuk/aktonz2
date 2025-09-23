import Link from 'next/link';

import AccountLayout from '../../components/account/AccountLayout';
import styles from '../../styles/Account.module.css';

const REGISTRATION_CARDS = [
  {
    label: 'Rent up to',
    value: '£1,800 pcm',
  },
  {
    label: 'Bedrooms',
    value: '2-3',
  },
  {
    label: 'Preferred areas',
    value: 'Shoreditch, Hackney, Highbury',
  },
  {
    label: 'Move in from',
    value: 'April 2025',
  },
];

const FEATURE_CARDS = [
  {
    title: 'Personal search team',
    copy:
      'Dedicated specialists shortlist the homes that match your wish list and arrange everything for your viewings.',
  },
  {
    title: 'Access to sneak peeks',
    copy:
      'See new listings before they reach the portals and secure a viewing slot that works around your schedule.',
  },
  {
    title: 'Access to price reductions',
    copy:
      'Be the first to hear when a property changes price so you can move quickly and beat the competition.',
  },
  {
    title: 'Email alerts',
    copy:
      'Tailored updates land in your inbox as soon as properties launch so you never miss the perfect place.',
  },
];

export default function AccountDashboard() {
  return (
    <AccountLayout
      heroSubtitle="Insights. Information. Control."
      heroTitle="My lettings search"
      heroDescription="London lettings is competitive but we are here to give you an advantage."
      heroCta={{
        label: "Let's get started",
        href: '/to-rent',
        secondary: { label: 'Talk to my team', href: '/contact' },
      }}
    >
      <section className={styles.introCard}>
        <div className={styles.introHeader}>
          <div>
            <h2>Register with us to jump the queue</h2>
            <p>
              Share a few details about the property you want so we can prioritise the homes that genuinely match what
              you are searching for.
            </p>
          </div>
          <Link href="/account/profile" className={styles.editLink}>
            Update my preferences
          </Link>
        </div>
        <div className={styles.registrationGrid}>
          {REGISTRATION_CARDS.map((card) => (
            <article key={card.label} className={styles.registrationTile}>
              <span className={styles.fieldLabel}>{card.label}</span>
              <span className={styles.fieldValue}>{card.value}</span>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.featureSection}>
        <h3>Ready to get ahead of other tenants?</h3>
        <div className={styles.featureGrid}>
          {FEATURE_CARDS.map((card) => (
            <article key={card.title} className={styles.featureCard}>
              <h4 className={styles.featureTitle}>{card.title}</h4>
              <p className={styles.featureDescription}>{card.copy}</p>
              <Link href="/contact" className={styles.featureLink}>
                Speak to an expert
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.secondarySection}>
        <div className={styles.secondaryContent}>
          <h3>Not ready to make a move yet?</h3>
          <p>
            Save interesting properties and we will keep them close to hand. When the timing is right, you will have a
            shortlist ready to view.
          </p>
          <div className={styles.secondaryActions}>
            <Link href="/favourites" className={styles.secondaryButton}>
              View my favourites
            </Link>
            <Link href="/for-sale" className={styles.secondaryLink}>
              Browse homes for sale
            </Link>
          </div>
        </div>
        <div className={styles.secondaryPanel}>
          <div className={styles.secondaryBadge}>Tip</div>
          <p className={styles.secondaryPanelText}>
            Save at least three properties to help us spot similar homes and send smarter alerts.
          </p>
        </div>
      </section>
    </AccountLayout>
  );
}
