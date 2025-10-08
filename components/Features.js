import styles from '../styles/Home.module.css';

export default function Features() {
  const items = [
    {
      icon: '💜',
      title: 'Fixed-fee selling',
      text: 'Instruct Aktonz from £799 including VAT and keep more of your final sale price.'
    },
    {
      icon: '🧭',
      title: 'Local experts on your street',
      text: 'Partner with an experienced agent who knows your neighbourhood inside out.'
    },
    {
      icon: '🕒',
      title: '24/7 control',
      text: 'Manage viewings, offers and updates in our online portal whenever it suits you.'
    },
    {
      icon: '🤝',
      title: 'Optional extras when you need them',
      text: 'Add hosted viewings, sales progression or mortgage advice to suit your move.'
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
