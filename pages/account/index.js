import styles from '../../styles/Account.module.css';

export default function AccountDashboard() {
  return (
    <main className={styles.main}>
      <h1 className={styles.heading}>
        Welcome to Aktonz, <span className={styles.user}>Shah</span>
      </h1>
      <p className={styles.subtitle}>Insights. Information. Control.</p>
      <h2 className={styles.prompt}>Are you looking to...</h2>
      <div className={styles.grid}>
        <div className={styles.card}>
          <h3>LET</h3>
          <p>Manage your rental properties online</p>
          <a href="/landlords" className={styles.button}>Get started now</a>
        </div>
        <div className={styles.card}>
          <h3>SELL</h3>
          <p>Stay in control of the sale of your home</p>
          <a href="/sell" className={styles.button}>Get started now</a>
        </div>
        <div className={styles.card}>
          <h3>RENT</h3>
          <p>Rent a property online, start to finish</p>
          <a href="/to-rent" className={styles.button}>Get started now</a>
        </div>
        <div className={styles.card}>
          <h3>BUY</h3>
          <p>See if you can stay ahead of other buyers</p>
          <a href="/for-sale" className={styles.button}>Get started now</a>
        </div>
      </div>
    </main>
  );
}

