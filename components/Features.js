import styles from '../styles/Home.module.css';

export default function Features() {
  const items = [
    {
      title: 'Extensive Listings',
      text: 'Browse hundreds of properties for sale or rent across the country.'
    },
    {
      title: 'Trusted Agents',
      text: 'Work with experienced agents with local market knowledge.'
    },
    {
      title: 'Smart Search',
      text: 'Filter by price, location and property type to find your ideal home.'
    }
  ];

  return (
    <section className={styles.features}>
      {items.map((item) => (
        <div className={styles.feature} key={item.title}>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </div>
      ))}
    </section>
  );
}
