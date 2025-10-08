import styles from '../styles/Home.module.css';

export default function Features() {
  const items = [
    {
      icon: '🎯',
      title: 'Strategic marketing campaigns',
      text: 'Professional photography, social ads and database alerts launch every listing with maximum impact.',
    },
    {
      icon: '🤝',
      title: 'Negotiators that fight your corner',
      text: 'Our local experts secure an average of 98% of asking price thanks to real-time market insight.',
    },
    {
      icon: '📊',
      title: 'Live performance dashboard',
      text: 'Track enquiries, viewing feedback and offers 24/7 so you can make confident decisions at speed.',
    },
    {
      icon: '🛠️',
      title: 'Move-ready partner network',
      text: 'Surveyors, conveyancers and mortgage specialists integrate seamlessly to keep your sale on track.',
    },
    {
      icon: '💡',
      title: 'Flexible service add-ons',
      text: 'Bolt on hosted viewings, premium staging or chain progression support whenever you need an extra hand.',
    },
    {
      icon: '🔒',
      title: 'Propertymark protected',
      text: 'Your move is safeguarded by industry-leading compliance, client money protection and rigorous processes.',
    },
  ];

  return (
    <section className={styles.featuresSection}>
      <div className={styles.sectionHeading}>
        <span className={styles.sectionEyebrow}>Why sellers choose Aktonz</span>
        <h2>Everything you need to move forward with confidence</h2>
        <p>
          We blend human expertise with powerful technology so your property stands out, your buyers stay engaged and
          your timeline keeps moving.
        </p>
      </div>
      <div className={styles.featuresGrid}>
        {items.map((item) => (
          <div className={styles.featureCard} key={item.title}>
            <div className={styles.featureIcon}>{item.icon}</div>
            <div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
