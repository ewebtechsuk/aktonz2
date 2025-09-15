import Head from 'next/head';
import styles from '../styles/Landlords.module.css';

export default function Landlords() {
  return (
    <main className={styles.main}>
      <Head>
        <title>Landlord Lettings Services</title>
      </Head>
      <section className={styles.hero}>
        <h1>Landlord Lettings Services</h1>
      </section>

      <section className={styles.intro}>
        <h2>Everything your let needs - leave it to us!</h2>
        <div className={styles.features}>
          <div className={styles.feature}>
            <h3>Tenancy Support</h3>
            <p>
              From referencing to renewals, our team looks after every stage of
              the tenancy so you can relax.
            </p>
          </div>
          <div className={styles.feature}>
            <h3>Property Services</h3>
            <p>
              We handle inspections, maintenance and repairs using vetted
              contractors at competitive prices.
            </p>
          </div>
          <div className={styles.feature}>
            <h3>Compliance Tracking</h3>
            <p>
              Stay on top of certificates and legal requirements with our
              proactive monitoring and reminders.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.included}>
        <h2>What's included?</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Service</th>
              <th>Included</th>
              <th>Additional</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Marketing on major portals</td>
              <td>✓</td>
              <td></td>
            </tr>
            <tr>
              <td>Professional photography</td>
              <td>✓</td>
              <td></td>
            </tr>
            <tr>
              <td>Tenant referencing</td>
              <td>✓</td>
              <td></td>
            </tr>
            <tr>
              <td>Tenancy agreement drafting</td>
              <td>✓</td>
              <td></td>
            </tr>
            <tr>
              <td>Deposit registration</td>
              <td>✓</td>
              <td></td>
            </tr>
            <tr>
              <td>Rent collection</td>
              <td>✓</td>
              <td></td>
            </tr>
            <tr>
              <td>24/7 emergency line</td>
              <td>✓</td>
              <td></td>
            </tr>
            <tr>
              <td>Maintenance coordination</td>
              <td>✓</td>
              <td></td>
            </tr>
            <tr>
              <td>Routine inspections</td>
              <td>✓</td>
              <td></td>
            </tr>
            <tr>
              <td>Compliance tracking</td>
              <td>✓</td>
              <td></td>
            </tr>
            <tr>
              <td>Renewal negotiation</td>
              <td>✓</td>
              <td></td>
            </tr>
            <tr>
              <td>Inventory & check-in/out</td>
              <td></td>
              <td>✓</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className={styles.testimonial}>
        <blockquote>
          “Aktonz handled everything for my rental – I couldn’t be happier.”
        </blockquote>
        <p className={styles.cite}>– Happy Landlord</p>
      </section>

      <section className={styles.cta}>
        <h2>Choose Aktonz to manage your property</h2>
        <a className={styles.ctaButton} href="/contact">
          Get in touch
        </a>
      </section>
    </main>
  );
}
