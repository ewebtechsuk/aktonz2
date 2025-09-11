import Link from 'next/link';
import styles from '../styles/Home.module.css';
import SearchBar from './SearchBar';

export default function Hero() {
  return (
    <section className={styles.hero}>
      <nav className={styles.nav}>
        <h1 className={styles.logo}>MyEstate</h1>
        <div className={styles.navLinks}>
          <Link href="/for-sale">Buy</Link>
          <Link href="/to-rent">Rent</Link>
          <Link href="/sell">Sell</Link>
        </div>
        <Link href="/login" className={styles.loginButton}>Login</Link>
      </nav>
      <div className={styles.heroContent}>
        <h2>London's Estate Agent</h2>
        <p className={styles.subtitle}>Get it done with London's number one</p>
        <SearchBar />
      </div>
    </section>
  );
}
