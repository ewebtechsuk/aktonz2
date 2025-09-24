import styles from '../styles/Home.module.css';

export default function Features() {
  const items = [
    {
      icon: '🎬',
      title: 'Lifecycle storytelling',
      text: 'Beautiful microsites, bios and explainer videos keep vendors excited before you arrive.'
    },
    {
      icon: '📊',
      title: 'Data-rich valuations',
      text: 'Live comparable data, price trends and interactive charts power confident conversations.'
    },
    {
      icon: '📝',
      title: 'Smart proposals',
      text: 'Branded proposals with e-signatures, analytics and engagement tracking built-in.'
    },
    {
      icon: '📣',
      title: 'Automated follow-ups',
      text: 'Always-on email, SMS and task nudges turn interest into signed instructions.'
    }
  ];

  return (
    <section className={styles.featuresSection}>
      <h2>End-to-end journeys that mirror how top agents win</h2>
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
