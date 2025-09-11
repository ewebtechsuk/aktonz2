import { FaFacebookF, FaInstagram, FaYoutube, FaTwitter } from 'react-icons/fa';
import styles from '../styles/Footer.module.css';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <div className={styles.brand}>
          <div className={styles.logo}>Aktonz</div>
          <div className={styles.socials}>
            <a href="#" aria-label="Facebook"><FaFacebookF /></a>
            <a href="#" aria-label="Instagram"><FaInstagram /></a>
            <a href="#" aria-label="YouTube"><FaYoutube /></a>
            <a href="#" aria-label="Twitter"><FaTwitter /></a>
          </div>
        </div>
        <div className={styles.columns}>
          <div className={styles.column}>
            <h4>About Aktonz</h4>
            <ul>
              <li><a href="#">About Aktonz Estate Agents</a></li>
              <li><a href="#">Sales jobs in London</a></li>
              <li><a href="#">Property Management in London</a></li>
              <li><a href="#">Branch Finder</a></li>
              <li><a href="#">News from Aktonz</a></li>
              <li><a href="#">Aktonz Accessibility Information</a></li>
              <li><a href="#">Aktonz investments</a></li>
            </ul>
          </div>
          <div className={styles.column}>
            <h4>Our estate agencies</h4>
            <ul>
              <li><a href="#">Central London estate agents</a></li>
              <li><a href="#">North London estate agents</a></li>
              <li><a href="#">East London estate agents</a></li>
              <li><a href="#">South London estate agents</a></li>
              <li><a href="#">West London estate agents</a></li>
            </ul>
          </div>
          <div className={styles.column}>
            <h4>Popular searches</h4>
            <ul>
              <li><a href="#">London property for sale</a></li>
              <li><a href="#">London lettings</a></li>
              <li><a href="#">London flats for sale</a></li>
              <li><a href="#">London homes to rent</a></li>
              <li><a href="#">New Homes in London</a></li>
            </ul>
          </div>
          <div className={styles.column}>
            <h4>Property intelligence</h4>
            <ul>
              <li><a href="#">Area guides</a></li>
              <li><a href="#">House price reports</a></li>
              <li><a href="#">Rental reports</a></li>
              <li><a href="#">Home valuation service</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div className={styles.bottom}>
        <ul>
          <li><a href="#">Aktonz Estate Agents</a></li>
          <li><a href="#">Investors</a></li>
          <li><a href="#">Terms and Conditions & Privacy Policy</a></li>
          <li><a href="#">Cookies Policy</a></li>
          <li><a href="#">Modern Slavery Statement</a></li>
          <li><a href="#">Health and Safety Statement</a></li>
          <li><a href="#">Sitemap</a></li>
        </ul>
        <p>&copy; {year} Aktonz. All rights reserved.</p>
      </div>
    </footer>
  );
}

