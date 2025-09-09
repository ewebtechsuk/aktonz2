import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import styles from '../styles/Header.module.css';

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleMobile = () => setMobileOpen(!mobileOpen);
  const closeMobile = () => setMobileOpen(false);

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <Link href="/">
          <Image
            src="https://aktonz.com/wp-content/uploads/2020/02/Milky-Black-Minimalist-Beauty-Logo-300x300.png"
            alt="Aktonz"
            width={60}
            height={60}
          />
        </Link>
      </div>
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          <li className={styles.navItem}><Link href="/">Home</Link></li>
          <li className={`${styles.navItem} ${styles.hasMega}`}>
            <span>Properties</span>
            <div className={styles.megaMenu}>
              <div>
                <h4>Buy</h4>
                <Link href="#">Residential</Link>
                <Link href="#">Commercial</Link>
              </div>
              <div>
                <h4>Rent</h4>
                <Link href="#">Residential</Link>
                <Link href="#">Commercial</Link>
              </div>
            </div>
          </li>
          <li className={styles.navItem}><Link href="#">Contact</Link></li>
        </ul>
      </nav>
      <button className={styles.hamburger} onClick={toggleMobile} aria-label="Menu">
        <span></span>
        <span></span>
        <span></span>
      </button>
      {mobileOpen && (
        <div className={styles.mobileMenu}>
          <ul>
            <li><Link href="/" onClick={closeMobile}>Home</Link></li>
            <li><Link href="#" onClick={closeMobile}>Properties</Link></li>
            <li><Link href="#" onClick={closeMobile}>Contact</Link></li>
          </ul>
        </div>
      )}
    </header>
  );
}
