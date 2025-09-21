import Link from 'next/link';
import styles from '../styles/Sell.module.css';

const stats = [
  {
    value: '102%',
    label: 'Average asking price achieved across our network*',
  },
  {
    value: '12,000+',
    label: 'Verified buyers currently registered with Aktonz',
  },
  {
    value: '9.4/10',
    label: 'Seller satisfaction score for the last 12 months',
  },
];

const reachBullets = [
  'Your listing appears instantly across aktonz.com and leading portals.',
  'Dedicated social campaigns promote your property to high-intent buyers.',
  'Professional photography and floorplans included as standard.',
];

const controlTiles = [
  {
    title: 'Real-time updates',
    description:
      'Track enquiries, viewings, offers and feedback in real time with the My Aktonz portal.',
  },
  {
    title: 'Secure document hub',
    description:
      'Access valuation reports, compliance documents and key milestones whenever you need them.',
  },
  {
    title: 'Collaborative decisions',
    description:
      'Approve marketing, confirm viewings and respond to offers with a single tap on mobile or desktop.',
  },
];

const expertCards = [
  {
    title: 'Dedicated local valuer',
    copy:
      'Your Aktonz expert understands the nuance of your neighbourhood and uses live market data to set the right strategy.',
  },
  {
    title: 'Progression specialists',
    copy:
      'Our sales progression team keeps solicitors, buyers and chains aligned so you move on schedule.',
  },
  {
    title: 'In-house marketing studio',
    copy:
      'From videography to targeted advertising, our creatives showcase your home at its very best.',
  },
];

const testimonials = [
  {
    quote:
      'Aktonz kept us updated every step and negotiated a brilliant result – we exchanged within eight weeks of listing.',
    author: 'Sophie & Daniel, Clapham',
  },
  {
    quote:
      'The My Aktonz portal meant no chasing for updates. We could see every viewing request and offer in one place.',
    author: 'Michael, Shoreditch',
  },
];

export default function Sell() {
  return (
    <main className={styles.sellPage}>
      <section className={`${styles.section} ${styles.hero}`}>
        <div className={`${styles.constrained} ${styles.heroInner}`}>
          <div className={styles.heroMedia}>
            <img
              src="https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80"
              alt="Townhouses on a sunny London street"
              loading="lazy"
            />
          </div>
          <div className={styles.heroContent}>
            <p className={styles.heroKicker}>Sell with Aktonz</p>
            <h1 className={styles.heroTitle}>
              Want to know how Aktonz simplifies the selling process?
            </h1>
            <p className={styles.heroDescription}>
              From strategic pricing advice to dedicated progression support, we combine local expertise
              with market-leading technology so you can sell with confidence.
            </p>
            <div className={styles.ctaGroup}>
              <Link href="/valuation" className={styles.primaryCta}>
                Book a valuation
              </Link>
              <Link href="/contact" className={styles.secondaryCta}>
                Request a call back
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.valuationSection}`}>
        <div className={`${styles.constrained} ${styles.valuationInner}`}>
          <div>
            <h2 className={styles.valuationTitle}>
              Want to know what your property is worth?
            </h2>
            <p className={styles.valuationCopy}>
              Arrange a free, no-obligation valuation with an Aktonz expert. We combine real-time buyer demand
              data with decades of neighbourhood experience to deliver recommendations tailored to your goals.
            </p>
            <div className={styles.ctaGroup}>
              <Link href="/valuation" className={styles.primaryCta}>
                Get your valuation
              </Link>
              <Link href="/about" className={styles.secondaryCta}>
                Discover our approach
              </Link>
            </div>
          </div>
          <div className={styles.statGrid}>
            {stats.map((item) => (
              <article key={item.label} className={styles.statCard}>
                <span className={styles.statValue}>{item.value}</span>
                <p className={styles.statLabel}>{item.label}</p>
              </article>
            ))}
          </div>
        </div>
        <p className={styles.disclaimer}>*Based on Aktonz sales completed between Jan–Dec 2023.</p>
      </section>

      <section className={styles.section}>
        <div className={`${styles.constrained} ${styles.twoColumn}`}>
          <div>
            <h2 className={styles.sectionTitle}>Reach the right buyers with Aktonz</h2>
            <p className={styles.sectionLead}>
              Your property is promoted across our award-winning digital channels the moment it hits the market.
              We match motivated buyers to your listing through personalised alerts, targeted campaigns and
              curated viewings.
            </p>
            <ul className={styles.checkList}>
              {reachBullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className={styles.sectionMedia}>
            <img
              src="https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=1200&q=80"
              alt="Aktonz agent capturing marketing photography"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.constrained}>
          <div className={styles.twoColumn}>
            <div className={styles.sectionMedia}>
              <img
                src="https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1200&q=80"
                alt="Seller reviewing the My Aktonz dashboard on a tablet"
                loading="lazy"
              />
            </div>
            <div>
              <h2 className={styles.sectionTitle}>Take control of your sale with My Aktonz</h2>
              <p className={styles.sectionLead}>
                Manage your sale from anywhere. Our secure portal keeps you informed and in control, whether
                you are reviewing feedback or approving the latest marketing assets.
              </p>
              <div className={styles.tileGrid}>
                {controlTiles.map((tile) => (
                  <article key={tile.title} className={styles.tile}>
                    <h3>{tile.title}</h3>
                    <p>{tile.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.constrained}>
          <h2 className={styles.sectionTitle}>Connect with our experts</h2>
          <p className={styles.sectionLead}>
            When you instruct Aktonz, you gain a team of specialists focused on every stage of your sale.
          </p>
          <div className={styles.expertGrid}>
            {expertCards.map((card) => (
              <article key={card.title} className={styles.expertCard}>
                <h3>{card.title}</h3>
                <p>{card.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.constrained}>
          <div className={styles.ctaBand}>
            <h2>Get a free property valuation with a local expert</h2>
            <p>
              Book an appointment in minutes and receive a tailored marketing strategy designed to secure
              the best possible price.
            </p>
            <Link href="/valuation" className={styles.primaryCta}>
              Book your valuation
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.constrained}>
          <h2 className={styles.sectionTitle}>Testimonials</h2>
          <div className={styles.testimonials}>
            {testimonials.map((item) => (
              <article key={item.author} className={styles.testimonialCard}>
                <p className={styles.quote}>{item.quote}</p>
                <p className={styles.citation}>{item.author}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
