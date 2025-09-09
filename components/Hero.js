import styles from '../styles/Home.module.css';
import SearchBar from './SearchBar';

export default function Hero() {
  return (
    <section className={styles.hero}>
      <nav className={styles.nav}>
        <h1 className={styles.logo}>MyEstate</h1>
        <div className={styles.navLinks}>
          <a href="#buy">Buy</a>
          <a href="#rent">Rent</a>
          <a href="#sell">Sell</a>
        </div>
      </nav>
      <div className={styles.heroContent}>
        <h2>Your trusted estate agent</h2>
        <p className={styles.subtitle}>Find your perfect home to buy or rent</p>
        <SearchBar />
        <a href="#listings" className={styles.ctaButton}>Browse listings</a>
      </div>
    </section>
  );
}
