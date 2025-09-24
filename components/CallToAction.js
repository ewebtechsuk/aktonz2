import Link from 'next/link';
import styles from '../styles/Home.module.css';

export default function CallToAction() {
  return (
    <section className={styles.callToAction}>
      <div className={styles.callToActionContent}>
        <p className={styles.eyebrow}>Get Started</p>
        <h2>See Aktonz in action</h2>
        <p>
          Book a tailored walkthrough to explore sample presentations, proposal
          templates and automation journeys mapped to your existing CRM.
        </p>
      </div>
      <div className={styles.callToActionActions}>
        <Link href="/contact" className={styles.primaryCta}>
          Book a demo
        </Link>
        <Link href="/valuation" className={styles.secondaryCta}>
          Explore valuation toolkit
        </Link>
      </div>
    </section>
  );
}
