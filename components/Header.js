import Link from 'next/link';
import { FaHome, FaKey, FaHeart, FaUser } from 'react-icons/fa';
import styles from '../styles/Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <Link href="/">Aktonz</Link>
      </div>
      <nav className={styles.nav}>
        <Link href="/for-sale" className={styles.navLink}>
          <FaHome className={styles.icon} />
          <span className={styles.label}>Buy</span>
        </Link>
        <Link href="/to-rent" className={styles.navLink}>
          <FaKey className={styles.icon} />
          <span className={styles.label}>Rent</span>
        </Link>
        <Link href="/favourites" className={styles.navLink}>
          <FaHeart className={styles.icon} />
          <span className={styles.label}>Favourites</span>
        </Link>
        <Link href="/account" className={styles.navLink}>
          <FaUser className={styles.icon} />
          <span className={styles.label}>Account</span>
        </Link>
      </nav>
    </header>
  );
}

