import Link from 'next/link';
import styles from '../../styles/Account.module.css';

export default function AccountDashboard() {
  return (
    <main className={styles.main}>
      <h1 className={styles.heading}>Welcome to Aktonz</h1>
      <p className={styles.subtitle}>Insights. Information. Control.</p>
      <h2 className={styles.prompt}>Are you looking to...</h2>
      <div className={styles.grid}>
        <div className={styles.card}>
          <h3>LET</h3>
          <p>Manage your rental properties online</p>
          <Link href="/landlords" className={styles.button}>
            Get started now
          </Link>
        </div>
        <div className={styles.card}>
          <h3>SELL</h3>
          <p>Stay in control of the sale of your home</p>
          <Link href="/sell" className={styles.button}>
            Get started now
          </Link>
        </div>
        <div className={styles.card}>
          <h3>RENT</h3>
          <p>Rent a property online, start to finish</p>
          <Link href="/to-rent" className={styles.button}>
            Get started now
          </Link>
        </div>
        <div className={styles.card}>
          <h3>BUY</h3>
          <p>See if you can stay ahead of other buyers</p>
          <Link href="/for-sale" className={styles.button}>
            Get started now
          </Link>
        </div>
      </div>
    </main>
  );
}

