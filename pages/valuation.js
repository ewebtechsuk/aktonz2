import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

import styles from '../styles/Valuation.module.css';
import MortgageCalculator from '../components/MortgageCalculator';
import RentAffordability from '../components/RentAffordability';

import { loadGoogleMaps } from '../lib/googleMapsLoader';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
};

export default function Valuation() {
  const router = useRouter();
  const [formValues, setFormValues] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const addressInputRef = useRef(null);

  useEffect(() => {
    let autocomplete;
    let isCancelled = false;

    loadGoogleMaps(GOOGLE_MAPS_API_KEY)
      .then((google) => {
        if (isCancelled || !google?.maps?.places || !addressInputRef.current) {
          return;
        }

        autocomplete = new google.maps.places.Autocomplete(addressInputRef.current, {
          fields: ['formatted_address', 'address_components', 'name'],
          types: ['geocode'],
          componentRestrictions: { country: ['uk'] },
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          const formattedAddress = place?.formatted_address || place?.name;

          if (formattedAddress) {
            setFormValues((current) => ({
              ...current,
              address: formattedAddress,
            }));
          }
        });
      })
      .catch((error) => {
        console.error('Failed to load Google Maps for address autocomplete', error);
      });

    return () => {
      isCancelled = true;
      if (autocomplete) {
        window.google?.maps?.event.clearInstanceListeners(autocomplete);
      }
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setStatus({ type: 'pending', message: '' });

    try {
      const { firstName, lastName, email, phone, address, notes, ...rest } = formValues;
      const name = [firstName, lastName]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(' ');

      const requestBody = {
        ...rest,
        name,
        email,
        phone,
        propertyAddress: address,
        message: notes,
      };

      const response = await fetch('/api/valuations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage = body?.error || 'We could not process your valuation request.';
        throw new Error(errorMessage);
      }

      const notifications = body?.notifications;
      const emailsSent = notifications?.sent !== false;

      const successMessages = emailsSent
        ? {
            redirect:
              'Thanks! Please check your email to activate your account. Redirecting you to your dashboard…',
            fallback:
              'Thanks! Please check your email to activate your account. You can continue to your account at /account.',
          }
        : {
            redirect:
              'Thanks! Your valuation request has been received. Email notifications are currently unavailable, but our team will follow up shortly. Redirecting you to your dashboard…',
            fallback:
              'Thanks! Your valuation request has been received. Email notifications are currently unavailable. You can continue to your account at /account.',
          };

      setFormValues(INITIAL_FORM);
      setStatus({ type: 'success', message: successMessages.redirect });

      try {
        await router.push('/account');
      } catch (navigationError) {
        console.error('Failed to redirect to account after valuation submission', navigationError);
        setStatus({ type: 'success', message: successMessages.fallback });
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: error?.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Book a Property Valuation in London | Aktonz</title>
        <meta
          name="description"
          content="Arrange a free Aktonz property valuation with a local expert and discover the best strategy to sell or let your home."
        />
      </Head>
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
        <form className={styles.form} onSubmit={handleSubmit}>
          <h2>Book a free valuation</h2>
          <label htmlFor="firstName">
            First name
            <input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              value={formValues.firstName}
              onChange={handleChange}
              required
            />
          </label>
          <label htmlFor="lastName">
            Last name
            <input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              value={formValues.lastName}
              onChange={handleChange}
              required
            />
          </label>
          <label htmlFor="email">
            Email
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={formValues.email}
              onChange={handleChange}
              required
            />
          </label>
          <label htmlFor="phone">
            Phone
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={formValues.phone}
              onChange={handleChange}
              required
            />
          </label>
          <label htmlFor="address">
            Property address
            <input
              id="address"
              name="address"
              type="text"
              autoComplete="street-address"
              ref={addressInputRef}
              value={formValues.address}
              onChange={handleChange}
              required
            />
          </label>
          <label htmlFor="notes">
            Additional notes
            <textarea
              id="notes"
              name="notes"
              value={formValues.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Share ideal times, access notes or anything else we should prepare."
            />
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Booking valuation…' : 'Book now'}
          </button>
          <p
            className={`${styles.formStatus} ${
              status.type === 'success'
                ? styles.formStatusSuccess
                : status.type === 'error'
                ? styles.formStatusError
                : ''
            }`}
            aria-live="polite"
          >
            {status.message}
          </p>
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
          <li>No obligation – it&apos;s completely free</li>
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
        <Link className={styles.ctaButton} href="/contact">
          Find your nearest office
        </Link>
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
    </>
  );
}

