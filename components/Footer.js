import { FaFacebookF, FaInstagram, FaYoutube, FaTwitter } from 'react-icons/fa';
import Link from 'next/link';
import styles from '../styles/Footer.module.css';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <div className={styles.brand}>
          <div className={styles.logo}>Aktonz</div>
          <div className={styles.socials}>
            <a
              href="https://www.facebook.com"
              aria-label="Facebook"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaFacebookF />
            </a>
            <a
              href="https://www.instagram.com"
              aria-label="Instagram"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaInstagram />
            </a>
            <a
              href="https://www.youtube.com"
              aria-label="YouTube"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaYoutube />
            </a>
            <a
              href="https://www.twitter.com"
              aria-label="Twitter"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaTwitter />
            </a>
          </div>
        </div>
        <div className={styles.columns}>
          <div className={styles.column}>
            <h4>About Aktonz</h4>
            <ul>
              <li><Link href="/about">About Aktonz Estate Agents</Link></li>
              <li><Link href="/jobs">Sales jobs in London</Link></li>
              <li><Link href="/property-management">Property Management in London</Link></li>
              <li><Link href="/branch-finder">Branch Finder</Link></li>
              <li><Link href="/news">News from Aktonz</Link></li>
              <li><Link href="/accessibility">Aktonz Accessibility Information</Link></li>
              <li><Link href="/investments">Aktonz investments</Link></li>
            </ul>
          </div>
          <div className={styles.column}>
            <h4>Our estate agencies</h4>
            <ul>
              <li><Link href="/central-london-estate-agents">Central London estate agents</Link></li>
              <li><Link href="/north-london-estate-agents">North London estate agents</Link></li>
              <li><Link href="/east-london-estate-agents">East London estate agents</Link></li>
              <li><Link href="/south-london-estate-agents">South London estate agents</Link></li>
              <li><Link href="/west-london-estate-agents">West London estate agents</Link></li>
            </ul>
          </div>
          <div className={styles.column}>
            <h4>Popular searches</h4>
            <ul>
              <li><Link href="/for-sale">London property for sale</Link></li>
              <li><Link href="/to-rent">London lettings</Link></li>
              <li><Link href="/flats-for-sale">London flats for sale</Link></li>
              <li><Link href="/homes-to-rent">London homes to rent</Link></li>
              <li><Link href="/new-homes">New Homes in London</Link></li>
            </ul>
          </div>
          <div className={styles.column}>
            <h4>Property intelligence</h4>
            <ul>
              <li>
                <Link href="/area-guides" prefetch={false}>
                  Area guides
                </Link>
              </li>
              <li><Link href="/house-price-reports">House price reports</Link></li>
              <li><Link href="/rental-reports">Rental reports</Link></li>
              <li><Link href="/valuation">Home valuation service</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className={styles.bottom}>
        <ul>
          <li><Link href="/">Aktonz Estate Agents</Link></li>
          <li><Link href="/investors">Investors</Link></li>
          <li><Link href="/terms-and-privacy">Terms and Conditions & Privacy Policy</Link></li>
          <li><Link href="/cookies-policy">Cookies Policy</Link></li>
          <li><Link href="/modern-slavery-statement">Modern Slavery Statement</Link></li>
          <li><Link href="/health-and-safety-statement">Health and Safety Statement</Link></li>
          <li><Link href="/sitemap">Sitemap</Link></li>
        </ul>
        <p>&copy; {year} Aktonz. All rights reserved.</p>
      </div>
    </footer>
  );
}

