import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Header.module.css';

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleMobile = () => setMobileOpen(!mobileOpen);
  const closeMobile = () => setMobileOpen(false);
  const router = useRouter();
  const isPropertiesActive =
    router.pathname.startsWith('/for-sale') ||
    router.pathname.startsWith('/commercial-for-sale') ||
    router.pathname.startsWith('/commercial-to-rent');

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
          <li className={styles.navItem}>
            <Link href="/" className={router.pathname === '/' ? styles.active : ''}>Home</Link>
          </li>
          <li className={`${styles.navItem} ${styles.hasMega}`}>
            <span className={isPropertiesActive ? styles.active : ''}>Properties</span>
            <div className={styles.megaMenu}>
              <div>
                <h4>Buy</h4>
                <Link
                  href="/for-sale"
                  className={router.pathname === '/for-sale' ? styles.active : ''}
                >
                  Residential
                </Link>
                <Link
                  href="/commercial-for-sale"
                  className={
                    router.pathname === '/commercial-for-sale' ? styles.active : ''
                  }
                >
                  Commercial
                </Link>
              </div>
              <div>
                <h4>Rent</h4>
                <Link
                  href="/to-rent"
                  className={router.pathname === '/to-rent' ? styles.active : ''}
                >
                  Residential
                </Link>
                <Link
                  href="/commercial-to-rent"
                  className={
                    router.pathname === '/commercial-to-rent' ? styles.active : ''
                  }
                >
                  Commercial
                </Link>
              </div>
            </div>
          </li>
          <li className={styles.navItem}>
            <Link
              href="/to-rent"
              className={router.pathname === '/to-rent' ? styles.active : ''}
            >
              To Rent
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link
              href="/sell"
              className={router.pathname === '/sell' ? styles.active : ''}
            >
              Sell
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link
              href="/contact"
              className={router.pathname === '/contact' ? styles.active : ''}
            >
              Contact
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link
              href="/login"
              className={router.pathname === '/login' ? styles.active : ''}
            >
              Login
            </Link>
          </li>

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
            <li>
              <Link
                href="/"
                onClick={closeMobile}
                className={router.pathname === '/' ? styles.active : ''}
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                href="/for-sale"
                onClick={closeMobile}
                className={router.pathname === '/for-sale' ? styles.active : ''}
              >
                For Sale
              </Link>
            </li>
            <li>
              <Link
                href="/commercial-for-sale"
                onClick={closeMobile}
                className={
                  router.pathname === '/commercial-for-sale' ? styles.active : ''
                }
              >
                Commercial For Sale
              </Link>
            </li>
            <li>
              <Link
                href="/to-rent"
                onClick={closeMobile}
                className={router.pathname === '/to-rent' ? styles.active : ''}
              >
                To Rent
              </Link>
            </li>
            <li>
              <Link
                href="/commercial-to-rent"
                onClick={closeMobile}
                className={
                  router.pathname === '/commercial-to-rent' ? styles.active : ''
                }
              >
                Commercial To Rent
              </Link>
            </li>
            <li>
              <Link
                href="/sell"
                onClick={closeMobile}
                className={router.pathname === '/sell' ? styles.active : ''}
              >
                Sell
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                onClick={closeMobile}
                className={router.pathname === '/contact' ? styles.active : ''}
              >
                Contact
              </Link>
            </li>
            <li>
              <Link
                href="/login"
                onClick={closeMobile}
                className={router.pathname === '/login' ? styles.active : ''}
              >
                Login
              </Link>
            </li>

          </ul>
        </div>
      )}
    </header>
  );
}
