import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';

import styles from '../styles/LandlordServices.module.css';
import { landlordServices } from '../data/services/landlordServices';

export default function LandlordServicesPage() {
  return (
    <>
      <Head>
        <title>Landlord Maintenance & Compliance Services | Aktonz</title>
        <meta
          name="description"
          content="Book and pay for landlord maintenance, compliance and certification services directly with Aktonz."
        />
      </Head>

      <section
        id="landlord-maintenance-services"
        className={styles.servicesSection}
      >
        <div className={styles.sectionHeading}>
          <h2>Landlord Maintenance &amp; Compliance Services</h2>
          <p>
            Everything you need to keep your rental compliant – from gas safety
            to legionella testing – with digital certificates, reminders and
            online payments built in.
          </p>
        </div>

        <div className={styles.servicesGrid}>
          {landlordServices.map((service, index) => (
            <article key={service.id} className={styles.serviceCard}>
              <div className={styles.serviceImageWrapper}>
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  style={{ objectFit: 'cover' }}
                  priority={index < 2}
                />
              </div>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <div className={styles.serviceMeta}>
                <span>
                  <strong>Price Range:</strong> {service.priceRange}
                </span>
                <span className={styles.serviceDuration}>{service.duration}</span>
              </div>
              <Link
                className={styles.bookNow}
                href={`/services/booking?service=${service.slug}`}
              >
                Book &amp; Pay Online
              </Link>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
