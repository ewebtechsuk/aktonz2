import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
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

      const emailNotification = extractEmailNotification(body);
      const emailDelivered = emailNotification.delivered !== false;

      const successMessage = emailDelivered
        ? 'Thanks! Your valuation request is on its way to our local experts. We\'ll be in touch shortly.'
        : 'Thanks! Your valuation request has been received. Email notifications are currently unavailable, but our team will follow up shortly.';

      setFormValues(INITIAL_FORM);
      setStatus({ type: 'success', message: successMessage });
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
        <title>Book a Fixed-Fee Property Valuation | Aktonz</title>
        <meta
          name="description"
          content="Arrange a free Aktonz property valuation with a local expert, discover our fixed-fee selling plans and manage your move online."
        />
      </Head>
      <main className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>Book a free valuation with a local Aktonz expert</h1>
          <ul>
            <li>Free, no-obligation visit from an agent who knows your neighbourhood</li>
            <li>Tailored plan outlining our fixed-fee marketing and negotiation strategy</li>
            <li>Set up with 24/7 access to the Aktonz online portal for instant updates</li>
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

function extractEmailNotification(body) {
  if (!body || typeof body !== 'object') {
    return { delivered: true };
  }

  const resultNotifications = body?.result?.notifications;
  if (Array.isArray(resultNotifications) && resultNotifications.length > 0) {
    const emailResult = resultNotifications.find((entry) => entry?.channel === 'email');
    if (emailResult && typeof emailResult === 'object') {
      return {
        delivered: emailResult.delivered,
        reason: emailResult.reason,
      };
    }

    const firstResult = resultNotifications[0];
    if (firstResult && typeof firstResult === 'object') {
      return {
        delivered: firstResult.delivered,
        reason: firstResult.reason,
      };
    }
  }

  if (typeof body.delivered === 'boolean') {
    return { delivered: body.delivered, reason: body.reason };
  }

  if (body.notifications && typeof body.notifications === 'object') {
    const { delivered, sent, reason } = body.notifications;
    if (typeof delivered === 'boolean') {
      return { delivered, reason };
    }
    if (typeof sent === 'boolean') {
      return { delivered: sent, reason };
    }
  }

  return { delivered: true };
}

