import Link from 'next/link';
import styles from '../styles/Home.module.css';

export default function Features() {
  const items = [
    {
      title: 'Sales',
      text: 'Browse our latest properties for sale.',
      href: '/for-sale'
    },
    {
      title: 'Lettings',
      text: 'Find the perfect home to rent.',
      href: '/to-rent'
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
          {item.href && <Link href={item.href}>View {item.title}</Link>}
        </div>
      ))}
    </section>
  );
}
