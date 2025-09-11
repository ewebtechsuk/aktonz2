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
        <a href="#login" className={styles.loginButton}>Login</a>
      </nav>
      <div className={styles.heroContent}>
        <h2>London's Estate Agent</h2>
        <p className={styles.subtitle}>Get it done with London's number one</p>
        <SearchBar />
      </div>
    </section>
  );
}
