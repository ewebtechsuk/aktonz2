import styles from '../styles/Home.module.css';

export default function Stats() {
  const items = [
    { number: '3x', text: 'more instructions won when journeys are personalised' },
    { number: '74%', text: 'faster follow-up speed using automated triggers' },
    { number: '92%', text: 'of vendors stay engaged through interactive proposals' }
  ];

  return (
    <section className={styles.stats}>
      <div className={styles.statsIntro}>
        <h2>Proven lift across the appraisal lifecycle</h2>
        <p>
          Aktonz orchestrates every touchpoint—from pre-appointment warmups to
          long-term nurturing—so your team closes more instructions with less
          manual effort.
        </p>
      </div>
      <div className={styles.statsGrid}>
        {items.map((item) => (
          <div className={styles.stat} key={item.text}>
            <span className={styles.number}>{item.number}</span>
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
