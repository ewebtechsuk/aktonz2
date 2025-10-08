import styles from '../styles/Home.module.css';

export default function Stats() {
  const items = [
    {
      number: '98%',
      title: 'Of asking price achieved',
      copy: 'Our expert negotiators combine data and local insight to maximise every offer.',
    },
    {
      number: '12 days',
      title: 'Average time to launch',
      copy: 'A dedicated move team prepares marketing, compliance and viewing schedules fast.',
    },
    {
      number: '£799',
      title: 'Transparent fixed fee',
      copy: 'No hidden extras. Add optional services only when you want additional support.',
    },
    {
      number: '24/7',
      title: 'Seller control centre',
      copy: 'Stay in the loop with instant updates, digital signatures and viewing feedback.',
    },
  ];

  return (
    <section className={styles.stats}>
      <div className={styles.statsContent}>
        <div className={styles.sectionHeading}>
          <span className={styles.sectionEyebrow}>Aktonz in numbers</span>
          <h2>Results that move you forward faster</h2>
          <p>Choose a team that blends market-leading tech with genuine people-first service.</p>
        </div>
        <div className={styles.statsGrid}>
          {items.map((item) => (
            <div className={styles.statCard} key={item.title}>
              <span className={styles.statNumber}>{item.number}</span>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
