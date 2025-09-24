import styles from '../styles/Home.module.css';

export default function Stats() {
  const items = [
    { number: '200+', text: 'buyers registered each week' },
    { number: '98%', text: 'customer satisfaction' },
    { number: '30+', text: 'local experts across London' }
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
