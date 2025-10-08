import styles from '../styles/Home.module.css';
import SearchBar from './SearchBar';

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <h1>Sell with Aktonz fixed-fee estate agents</h1>
        <p className={styles.subtitle}>
          List your property from £799 including VAT, stay in control with our 24/7 online portal and lean on a
          dedicated Aktonz expert who knows your street.
        </p>
        <SearchBar />
      </div>
    </section>
  );
}
