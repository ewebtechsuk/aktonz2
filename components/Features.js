import styles from '../styles/Home.module.css';

export default function Features() {
  const items = [
    {
      icon: '🏠',
      title: 'Let your property hassle free',
      text: 'Our team handles everything from tenant search to management.'
    },
    {
      icon: '💰',
      title: "What's your home worth?",
      text: 'Get an instant online valuation today.'
    },
    {
      icon: '🔍',
      title: 'Find the right property for you',
      text: 'Browse thousands of homes across London.'
    },
    {
      icon: '🤝',
      title: 'Need help? Ask our experts',
      text: 'Our local agents are here to support you.'
    }
  ];

  return (
    <section className={styles.featuresSection}>
      <h2>When you need experts</h2>
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
