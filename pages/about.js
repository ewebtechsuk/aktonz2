import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/About.module.css';

const highlights = [
  {
    title: 'Local roots, city-wide reach',
    description:
      'We combine boutique neighbourhood insight with the scale to market homes across Greater London and the commuter belt.',
  },
  {
    title: 'Obsessed with service',
    description:
      'Extended opening hours, rapid response teams and a proactive client care squad keep every move on track.',
  },
  {
    title: 'Innovation that matters',
    description:
      'From immersive digital tours to zero-emission viewing fleets, we build technology that removes friction for movers.',
  },
];

const metrics = [
  { label: 'Neighbourhood experts across London and the South East', value: '24 offices' },
  { label: 'Average customer satisfaction score in 2024', value: '96%' },
  { label: 'Tenancies and sales completed last year', value: '4,800+' },
  { label: 'Carbon saving from our electric viewing fleet', value: '38 tonnes' },
];

const advisoryPoints = [
  {
    title: 'Data-led advice',
    description:
      'Market intelligence dashboards benchmark every home we launch, ensuring pricing is precise and marketing spend is targeted.',
  },
  {
    title: 'Integrated services',
    description:
      'Sales, lettings, new homes and property management operate as one connected team so our clients are never passed around.',
  },
  {
    title: 'Dedicated move managers',
    description:
      'A single point of contact keeps legal progress, finance checks and key handovers moving at pace.',
  },
];

const values = [
  {
    title: 'Relentless local knowledge',
    description:
      'Every office is powered by residents who live and breathe their postcodes, feeding real-time insights back to clients.',
  },
  {
    title: 'Transparency at every step',
    description:
      'Live dashboards, weekly vendor reports and tenant feedback loops keep you in control of decisions.',
  },
  {
    title: 'Community first',
    description:
      'We reinvest in schools, youth programmes and independent businesses around each office we open.',
  },
  {
    title: 'Sustainable moves',
    description:
      'Electric minis, reusable signage and paperless onboarding shrink the environmental footprint of every transaction.',
  },
];

const timeline = [
  {
    year: '2025',
    description:
      'Expanded beyond London with the acquisition of Imagine Homes, bringing Watford, Bushey and Hemel Hempstead into the Aktonz network.',
  },
  {
    year: '2024',
    description:
      'Welcomed the Ludlow Thompson lettings specialists and opened our first East London hub in Bow.',
  },
  {
    year: '2023',
    description:
      'Rolled out the first all-electric Aktonz Minis and integrated the Atkinson McLeod team, strengthening our South London coverage.',
  },
  {
    year: '2022',
    description:
      'Acquired Stones Residential and Gordon & Co to deepen expertise across North West and Central London.',
  },
  {
    year: '2021',
    description:
      'Opened our purpose-built client centre in Chiswick, uniting marketing, compliance and customer success under one roof.',
  },
  {
    year: '2018',
    description:
      'Launched MyAktonz, a client portal delivering real-time viewing feedback, offer analytics and tenancy updates.',
  },
  {
    year: '2014',
    description:
      'Introduced the first café-style neighbourhood branches with extended 9am–9pm opening hours.',
  },
  {
    year: '2010',
    description:
      'Aktonz founded in Notting Hill as a two-person agency determined to reimagine how London moves.',
  },
];

const services = [
  {
    title: 'Sales strategy',
    description:
      'Consultative valuations, bespoke launch plans and a global buyer database deliver premium results for every listing.',
  },
  {
    title: 'Lettings & Build to Rent',
    description:
      'From corporate relocation to student lets, our teams keep occupancy high and compliance watertight.',
  },
  {
    title: 'Property management',
    description:
      '24/7 maintenance, smart home monitoring and resident care programmes protect investments and tenancies.',
  },
  {
    title: 'New homes & development',
    description:
      'Dedicated project marketing and international roadshows launch schemes with data-backed release strategies.',
  },
  {
    title: 'Corporate services',
    description:
      'Relocation consultants support HR teams with tailored move-in journeys for talent arriving from across the globe.',
  },
  {
    title: 'Private office',
    description:
      'Discreet advisory for prime buyers, investors and landlords seeking off-market opportunities.',
  },
];

export default function About() {
  return (
    <>
      <Head>
        <title>About Aktonz | Property Portal</title>
        <meta
          name="description"
          content="Discover how Aktonz pairs local expertise, award-winning service and sustainable innovation to make moving across London effortless."
        />
      </Head>
      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>About Aktonz</span>
            <h1 className={styles.heroTitle}>
              The property partner moving London forward for more than a decade
            </h1>
            <p className={styles.heroSubtitle}>
              From our first boutique office in Notting Hill to a connected network of data-led hubs, we have helped tens of thousands of people buy, sell and rent with confidence across London and the South East.
            </p>
            <div className={styles.heroHighlights}>
              {highlights.map((item) => (
                <article key={item.title} className={styles.highlightCard}>
                  <h3 className={styles.highlightTitle}>{item.title}</h3>
                  <p className={styles.highlightDescription}>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section aria-label="Aktonz in numbers" className={styles.metrics}>
          {metrics.map((metric) => (
            <article key={metric.label} className={styles.metric}>
              <span className={styles.metricNumber}>{metric.value}</span>
              <p className={styles.metricLabel}>{metric.label}</p>
            </article>
          ))}
        </section>

        <section className={styles.twoColumn}>
          <div>
            <h2 className={styles.sectionTitle}>Advisory without compromise</h2>
            <p className={styles.sectionSubtitle}>
              We blend hyper-local knowledge with city-wide scale, arming clients with the intelligence and service they need to make decisive moves in one of the world&rsquo;s most competitive property markets.
            </p>
          </div>
          <div className={styles.cardList}>
            {advisoryPoints.map((point) => (
              <article key={point.title} className={styles.card}>
                <h3 className={styles.cardTitle}>{point.title}</h3>
                <p className={styles.cardDescription}>{point.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.values}>
          <h2 className={styles.sectionTitle}>What we stand for</h2>
          <p className={styles.sectionSubtitle}>
            Aktonz was built on the belief that agency should feel personal, transparent and energising. These values guide every colleague and every client relationship.
          </p>
          <div className={styles.valueGrid}>
            {values.map((value) => (
              <article key={value.title} className={styles.valueCard}>
                <h3 className={styles.valueTitle}>{value.title}</h3>
                <p className={styles.valueDescription}>{value.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.timeline}>
          <h2 className={styles.sectionTitle}>Our journey</h2>
          <p className={styles.sectionSubtitle}>
            Milestones that shaped Aktonz into the award-winning, full-service agency our clients trust today.
          </p>
          <ol className={styles.timelineList}>
            {timeline.map((milestone) => (
              <li key={milestone.year} className={styles.timelineItem}>
                <span className={styles.timelineYear}>{milestone.year}</span>
                <p className={styles.timelineContent}>{milestone.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.services}>
          <h2 className={styles.sectionTitle}>Services that power every move</h2>
          <p className={styles.sectionSubtitle}>
            Whether you are selling a family home, launching a rental portfolio or relocating talent, our specialists bring clarity and momentum.
          </p>
          <div className={styles.serviceGrid}>
            {services.map((service) => (
              <article key={service.title} className={styles.serviceCard}>
                <h3 className={styles.cardTitle}>{service.title}</h3>
                <p className={styles.cardDescription}>{service.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.cta}>
          <div>
            <h2 className={styles.ctaTitle}>Ready to experience the Aktonz difference?</h2>
            <p className={styles.ctaDescription}>
              Speak to our team about your plans and we&rsquo;ll build a strategy around your goals, timings and neighbourhood ambitions.
            </p>
          </div>
          <div className={styles.ctaActions}>
            <Link href="/contact" className={styles.primaryButton}>
              Start a conversation
            </Link>
            <Link href="/valuation" className={styles.secondaryButton}>
              Book a valuation
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
