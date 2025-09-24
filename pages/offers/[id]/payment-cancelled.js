import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../../../styles/OfferStatus.module.css';

export default function OfferPaymentCancelled() {
  const router = useRouter();
  const propertyLink = router.query.id
    ? `/property/${Array.isArray(router.query.id) ? router.query.id[0] : router.query.id}`
    : '/';

  return (
    <div className={styles.page}>
      <Head>
        <title>Payment cancelled | Offer</title>
      </Head>
      <div className={styles.panel}>
        <h1 className={styles.error}>Payment cancelled</h1>
        <p>
          You left the secure checkout before completing your holding deposit.
          If this was a mistake you can restart the payment from your offer
          confirmation email or try again below.
        </p>
        <div className={styles.actions}>
          <Link href={propertyLink} className={styles.primaryAction}>
            Try again
          </Link>
          <Link href="/contact" className={styles.secondaryAction}>
            Talk to our team
          </Link>
        </div>
      </div>
    </div>
  );
}
