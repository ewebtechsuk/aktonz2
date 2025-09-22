import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/Careers.module.css';

const highlights = [
  {
    value: '60+',
    label: 'Neighbourhood specialists supporting buyers, sellers and renters across London.',
  },
  {
    value: '94%',
    label: 'Of our people say they receive actionable coaching every single week.',
  },
  {
    value: '24/7',
    label: 'Digital tools and data science helping you deliver standout customer service.',
  },
];

const values = [
  {
    title: 'Learn fast, stay curious',
    description:
      'Structured academies, weekly masterclasses and personal mentors accelerate your growth from day one.',
  },
  {
    title: 'Bring the energy',
    description:
      'We are bold, ambitious and collaborative. We celebrate big wins and rally together when the market shifts.',
  },
  {
    title: 'Own every customer moment',
    description:
      'Aktonz teams blend best-in-class tech with real relationships so every client feels championed.',
  },
];

const teams = [
  {
    name: 'Sales & Lettings',
    description:
      'Lead negotiations, source instructions and guide clients with confidence backed by real-time market intelligence.',
    vacancies: 14,
    focus: 'Progress from Associate to Senior Negotiator in as little as 18 months.',
  },
  {
    name: 'Property Management',
    description:
      'Create wow moments for landlords and residents while handling compliance, maintenance and renewals flawlessly.',
    vacancies: 9,
    focus: 'Be supported by specialist legal and repairs teams so you can focus on people.',
  },
  {
    name: 'New Business & Marketing',
    description:
      'Shape the Aktonz brand, deliver campaigns that convert, and unlock partnerships across London.',
    vacancies: 5,
    focus: 'Cross-functional squads give you ownership from concept to launch.',
  },
  {
    name: 'Operations & Data',
    description:
      'Optimise our platform, design smart processes and keep our offices and tech performing at pace.',
    vacancies: 4,
    focus: 'Experiment with automation and analytics that power thousands of transactions.',
  },
  {
    name: 'Customer Experience',
    description:
      'Be the reassuring voice guiding movers through valuations, offers, referencing and move-in day.',
    vacancies: 7,
    focus: 'Hybrid teams offer flexible scheduling with premium customer tooling.',
  },
  {
    name: 'Graduates & Interns',
    description:
      'Kick-start your property career with rotational placements, mentors and leadership exposure.',
    vacancies: 12,
    focus: 'Fast-track programmes include ARLA and RICS accreditation support.',
  },
];

const vacancies = [
  {
    title: 'Senior Sales Negotiator',
    location: 'Canary Wharf',
    type: 'Full-time',
    closing: 'Applications close 8 November 2024',
    email: 'talent@aktonz.co.uk',
  },
  {
    title: 'Property Manager',
    location: 'Shoreditch',
    type: 'Hybrid',
    closing: 'Interviews ongoing — apply today',
    email: 'talent@aktonz.co.uk',
  },
  {
    title: 'Lettings Associate (Graduate)',
    location: 'South Kensington',
    type: 'Full-time',
    closing: 'January 2025 intake',
    email: 'graduates@aktonz.co.uk',
  },
  {
    title: 'Customer Experience Partner',
    location: 'Chiswick Support Centre',
    type: 'Flexible shifts',
    closing: 'Closes 22 November 2024',
    email: 'talent@aktonz.co.uk',
  },
  {
    title: 'Marketing Campaign Manager',
    location: 'London Bridge',
    type: 'Hybrid',
    closing: 'Closes 29 November 2024',
    email: 'talent@aktonz.co.uk',
  },
  {
    title: 'Technology Delivery Lead',
    location: 'Remote-first, London hub',
    type: 'Full-time',
    closing: 'Closes 15 December 2024',
    email: 'talent@aktonz.co.uk',
  },
];

const benefits = [
  'Uncapped commission structure with quarterly accelerators and recognition trips.',
  'Private medical cover, wellbeing allowance and access to mental health first aiders.',
  'Industry qualifications paid for — ARLA, CeMAP, NFoPP and leadership coaching.',
  'Electric company car scheme, cycle to work and travel season ticket loans.',
  'Recharge days, enhanced parental leave and support for returning to work.',
  'Volunteering days to back the communities we serve across London.',
];

const process = [
  {
    title: 'Apply in minutes',
    description: 'Share your CV or LinkedIn profile — no cover letter needed. We review every application personally.',
  },
  {
    title: 'Chat with Talent',
    description: 'A 20-minute call to understand your ambitions, strengths and what makes you unstoppable.',
  },
  {
    title: 'Show us your impact',
    description: 'Role-specific interview and a practical scenario so you can demonstrate how you deliver for customers.',
  },
  {
    title: 'Meet the team',
    description: 'Spend time in branch or at HQ to feel the pace, meet future teammates and ask anything.',
  },
];

const testimonials = [
  {
    quote:
      'I joined as a lettings associate and now lead a sales team. The pace is intense but the coaching and data at our fingertips make every day exciting.',
    name: 'Safiya Mensah',
    role: 'Sales Manager, East London',
  },
  {
    quote:
      'Aktonz backed me through my ARLA exams and gave me the confidence to own a portfolio of 400 homes. You are trusted quickly here.',
    name: 'Luca Romano',
    role: 'Senior Property Manager',
  },
];

export default function Careers() {
  return (
    <>
      <Head>
        <title>Careers at Aktonz</title>
        <meta
          name="description"
          content="Explore careers at Aktonz. Join ambitious teams redefining the London property experience with data-led service and unstoppable energy."
        />
      </Head>
      <main className={styles.careers}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <span className={styles.heroKicker}>Careers</span>
            <h1 className={styles.heroTitle}>Make it with us</h1>
            <p className={styles.heroSubtitle}>
              We have a reputation for nurturing driven, ambitious professionals. Bring the hunger to succeed and we will match it
              with world-class coaching, technology and a network that opens doors all across London.
            </p>
            <div className={styles.heroActions}>
              <Link href="#vacancies" className={`${styles.button} ${styles.primaryButton}`}>
                View open roles
              </Link>
              <Link href="/register" className={`${styles.button} ${styles.secondaryButton}`}>
                Join our talent network
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.highlightStrip} aria-label="Aktonz career highlights">
          {highlights.map((item) => (
            <div className={styles.highlight} key={item.label}>
              <span className={styles.highlightValue}>{item.value}</span>
              <span className={styles.highlightLabel}>{item.label}</span>
            </div>
          ))}
        </section>

        <section className={styles.section} aria-labelledby="careers-intro">
          <div className={styles.sectionHeader}>
            <h2 id="careers-intro" className={styles.sectionTitle}>
              A growth mindset from day one
            </h2>
            <p className={styles.sectionIntro}>
              A career with Aktonz is for people who love the buzz of London property, thrive on accountability and want to see
              their effort rewarded. We combine in-branch expertise with a digital backbone so you can focus on relationships while
              the platform handles the rest.
            </p>
          </div>
          <div className={styles.valuesGrid}>
            {values.map((value) => (
              <article className={styles.valueCard} key={value.title}>
                <h3 className={styles.valueHeading}>{value.title}</h3>
                <p className={styles.valueText}>{value.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} id="teams" aria-labelledby="careers-teams">
          <div className={styles.sectionHeader}>
            <h2 id="careers-teams" className={styles.sectionTitle}>
              Getting it done: Our teams
            </h2>
            <p className={styles.sectionIntro}>
              Choose the path that matches your strengths. Wherever you start, clear progression routes, transparent goals and a
              supportive leadership team keep you moving forward.
            </p>
          </div>
          <div className={styles.teamsGrid}>
            {teams.map((team) => (
              <article className={styles.teamCard} key={team.name}>
                <div className={styles.teamMeta}>
                  <h3 className={styles.teamTitle}>{team.name}</h3>
                  <span className={styles.teamVacancies}>{team.vacancies} vacancies</span>
                </div>
                <p className={styles.teamDescription}>{team.description}</p>
                <p className={styles.teamDescription}>{team.focus}</p>
                <Link href="#vacancies" className={styles.teamLink}>
                  See current roles
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} id="vacancies" aria-labelledby="careers-vacancies">
          <div className={styles.sectionHeader}>
            <h2 id="careers-vacancies" className={styles.sectionTitle}>
              Latest vacancies
            </h2>
            <p className={styles.sectionIntro}>
              We recruit on a rolling basis. If you cannot see the perfect role, send us your details and we will reach out when
              the right opportunity lands.
            </p>
          </div>
          <div className={styles.vacanciesGrid}>
            {vacancies.map((vacancy) => (
              <article className={styles.vacancyCard} key={vacancy.title}>
                <h3 className={styles.vacancyTitle}>{vacancy.title}</h3>
                <div className={styles.vacancyMeta}>
                  <span>{vacancy.location}</span>
                  <span>{vacancy.type}</span>
                  <span>{vacancy.closing}</span>
                </div>
                <div className={styles.vacancyAction}>
                  <a
                    className={`${styles.button} ${styles.secondaryButton}`}
                    href={`mailto:${vacancy.email}?subject=${encodeURIComponent(`Application: ${vacancy.title}`)}`}
                  >
                    Apply now
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="careers-benefits">
          <div className={styles.sectionHeader}>
            <h2 id="careers-benefits" className={styles.sectionTitle}>
              Benefits that back your ambition
            </h2>
            <p className={styles.sectionIntro}>
              Being unstoppable takes energy. From wellbeing to recognition, we invest in what keeps you performing at your best.
            </p>
          </div>
          <ul className={styles.benefitsList}>
            {benefits.map((benefit) => (
              <li className={styles.benefitItem} key={benefit}>
                {benefit}
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="careers-process">
          <div className={styles.sectionHeader}>
            <h2 id="careers-process" className={styles.sectionTitle}>
              The Aktonz hiring experience
            </h2>
            <p className={styles.sectionIntro}>
              We keep things transparent, timely and human. Expect honest feedback at every step.
            </p>
          </div>
          <div className={styles.processSteps}>
            {process.map((step) => (
              <article className={styles.step} key={step.title}>
                <h3 className={styles.stepHeading}>{step.title}</h3>
                <p className={styles.stepText}>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="careers-voices">
          <div className={styles.sectionHeader}>
            <h2 id="careers-voices" className={styles.sectionTitle}>
              Voices from the team
            </h2>
            <p className={styles.sectionIntro}>
              Real stories from people who chose Aktonz and now shape the future of London property with us.
            </p>
          </div>
          <div className={styles.testimonialsGrid}>
            {testimonials.map((testimonial) => (
              <figure className={styles.testimonial} key={testimonial.name}>
                <blockquote className={styles.testimonialQuote}>{testimonial.quote}</blockquote>
                <figcaption>
                  <p className={styles.testimonialName}>{testimonial.name}</p>
                  <p className={styles.testimonialRole}>{testimonial.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className={styles.ctaSection} aria-labelledby="careers-cta">
          <h2 id="careers-cta" className={styles.ctaTitle}>
            Ready to get it done with Aktonz?
          </h2>
          <p className={styles.ctaText}>
            Email talent@aktonz.co.uk or call 0200 123 4000 for a confidential chat. Tell us where you want to go — we will help
            you get there.
          </p>
          <div className={styles.ctaActions}>
            <a className={`${styles.button} ${styles.primaryButton}`} href="mailto:talent@aktonz.co.uk">
              Send your CV
            </a>
            <Link href="/contact" className={`${styles.button} ${styles.secondaryButton}`}>
              Talk to our talent team
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
