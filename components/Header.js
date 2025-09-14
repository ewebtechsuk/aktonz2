import { useState } from 'react';
import Link from 'next/link';
import { FaHome, FaKey, FaHeart, FaUser } from 'react-icons/fa';
import styles from '../styles/Header.module.css';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const closeMenu = () => setMenuOpen(false);

  const navLinks = (
    <>
      <Link href="/for-sale" className={styles.navLink} onClick={closeMenu}>
        <FaHome className={styles.icon} />
        <span className={styles.label}>Buy</span>
      </Link>
      <Link href="/to-rent" className={styles.navLink} onClick={closeMenu}>
        <FaKey className={styles.icon} />
        <span className={styles.label}>Rent</span>
      </Link>
      <Link href="/favourites" className={styles.navLink} onClick={closeMenu}>
        <FaHeart className={styles.icon} />
        <span className={styles.label}>Favourites</span>
      </Link>
      <Link href="/account" className={styles.navLink} onClick={closeMenu}>
        <FaUser className={styles.icon} />
        <span className={styles.label}>Account</span>
      </Link>
    </>
  );

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <Link href="/">Aktonz</Link>
      </div>

      <nav className={styles.nav}>{navLinks}</nav>

      <button
        className={styles.hamburger}
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <nav
        className={`${styles.mobileMenu} ${menuOpen ? styles.menuOpen : ''}`}
      >
        {navLinks}
      </nav>
    </header>
  );
}

