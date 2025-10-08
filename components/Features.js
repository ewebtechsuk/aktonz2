import styles from '../styles/Home.module.css';

export default function Features() {
  const items = [
    {
      icon: '💜',
      title: 'Transparent fixed fees',
      text: 'Instruct Aktonz from £799 including VAT and know exactly what you will pay from day one.'
    },
    {
      icon: '🧭',
      title: 'Dedicated local expertise',
      text: 'Work with an experienced agent who lives and negotiates in your neighbourhood.'
    },
    {
      icon: '🕒',
      title: '24/7 online control',
      text: 'Track viewings, feedback and offers in real time with our digital seller portal.'
    },
    {
      icon: '🤝',
      title: 'Support when you need it',
      text: 'Add hosted viewings, sales progression or mortgage advice to tailor your move.'
    }
  ];

  return (
    <section className={styles.featuresSection}>
      <h2>Everything you need to move forward</h2>
      <div className={styles.featuresGrid}>
        {items.map((item) => (
          <div className={styles.featureCard} key={item.title}>
            <div className={styles.featureIcon}>{item.icon}</div>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
