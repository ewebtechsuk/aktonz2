import styles from '../styles/Valuation.module.css';
import MortgageCalculator from '../components/MortgageCalculator';
import RentAffordability from '../components/RentAffordability';

export default function Valuation() {
  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>Book a Property Valuation in London</h1>
          <ul>
            <li>Free, no obligation appointment with a local expert</li>
            <li>Clear marketing strategy for your property</li>
            <li>14,000 buyers and tenants registered last month</li>
          </ul>
        </div>
        <form className={styles.form}>
          <h2>Book a free valuation</h2>
          <label htmlFor="firstName">
            First name
            <input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
            />
          </label>
          <label htmlFor="lastName">
            Last name
            <input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
            />
          </label>
          <label htmlFor="email">
            Email
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
            />
          </label>
          <label htmlFor="phone">
            Phone
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
            />
          </label>
          <label htmlFor="address">
            Property address
            <input
              id="address"
              name="address"
              type="text"
              autoComplete="street-address"
            />
          </label>
          <button type="submit">Book now</button>
        </form>
      </section>

      <section className={styles.section}>
        <h2>Why do I need a property valuation?</h2>
        <ul>
          <li>Understand how much your home is worth</li>
          <li>Receive expert marketing advice</li>
          <li>Plan your next move with confidence</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>Why choose Aktonz for my property valuation?</h2>
        <ul>
          <li>Local experts across London</li>
          <li>Thousands of buyers and tenants ready to move</li>
          <li>No obligation – it's completely free</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>Mortgage Calculator</h2>
        <MortgageCalculator />
      </section>

      <section className={styles.section}>
        <h2>Rent Affordability Calculator</h2>
        <RentAffordability />
      </section>

      <section className={styles.cta}>
        <h2>Book a house or flat valuation with Aktonz</h2>
        <p>Contact our team today and receive a detailed valuation report.</p>
        <a className={styles.ctaButton} href="/contact">
          Find your nearest office
        </a>
      </section>

      <section className={styles.opening}>
        <h2>Opening hours</h2>
        <table>
          <tbody>
            <tr>
              <td>Monday - Friday</td>
              <td>9am - 7pm</td>
            </tr>
            <tr>
              <td>Saturday</td>
              <td>10am - 4pm</td>
            </tr>
            <tr>
              <td>Sunday</td>
              <td>Closed</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  );
}

