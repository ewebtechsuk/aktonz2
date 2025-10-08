import styles from '../styles/Home.module.css';

export default function Stats() {
  const items = [
    { number: '£799', text: 'Fixed selling fee including VAT' },
    { number: 'Free', text: 'No-obligation valuations from local Aktonz experts' },
    { number: '24/7', text: 'Online control of viewings, offers and updates' }
  ];

  return (
    <section className={styles.stats}>
      {items.map((item) => (
        <div className={styles.stat} key={item.text}>
          <span className={styles.number}>{item.number}</span>
          <span>{item.text}</span>
        </div>
      ))}
    </section>
  );
}
