import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import styles from '../../../styles/OfferStatus.module.css';

function formatCurrency(value) {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(Number(value));
}

export default function OfferPaymentSuccess() {
  const router = useRouter();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Confirming your payment.');
  const [offer, setOffer] = useState(null);

  const sessionId = useMemo(() => {
    if (!router.isReady) return null;
    const raw = router.query.session_id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [router.isReady, router.query]);

  useEffect(() => {
    if (!router.isReady) return;
    if (!sessionId) {
      setStatus('error');
      setMessage('Missing payment reference.');
      return;
    }

    fetch(`/api/payments/session?session_id=${sessionId}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to confirm payment');
        }
        const data = await response.json();
        setOffer(data.offer || null);
        const paymentStatus = data.session?.payment_status;
        if (paymentStatus === 'paid') {
          setStatus('success');
          setMessage('Payment confirmed. Thank you for securing the property.');
        } else {
          setStatus('warning');
          setMessage('Payment pending. We will update you once the checkout completes.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('We could not verify your payment. Please contact our team.');
      });
  }, [router.isReady, sessionId]);

  const statusLabel =
    status === 'success'
      ? 'Payment confirmed'
      : status === 'warning'
      ? 'Payment pending'
      : 'Payment issue';

  const propertyLink = offer?.propertyId
    ? `/property/${offer.propertyId}`
    : '/';

  const headingClass =
    status === 'success'
      ? styles.success
      : status === 'error'
      ? styles.error
      : '';

  return (
    <div className={styles.page}>
      <Head>
        <title>{statusLabel} | Offer</title>
      </Head>
      <div className={styles.panel}>
        <h1 className={headingClass}>
          {statusLabel}
        </h1>
        <p>{message}</p>

        {offer && (
          <div className={styles.details}>
            <span>
              <strong>Offer reference</strong>
              <span>{offer.id}</span>
            </span>
            <span>
              <strong>Holding deposit</strong>
              <span>{formatCurrency(offer.depositAmount)}</span>
            </span>
            <span>
              <strong>Buyer</strong>
              <span>{offer.name}</span>
            </span>
            <span>
              <strong>Email</strong>
              <span>{offer.email}</span>
            </span>
          </div>
        )}

        <div className={styles.actions}>
          <Link href={propertyLink} className={styles.primaryAction}>
            Back to property
          </Link>
          <Link href="/" className={styles.secondaryAction}>
            Explore more homes
          </Link>
        </div>
      </div>
    </div>
  );
}
