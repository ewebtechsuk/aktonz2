import React from 'react';
import styles from '../../styles/ContactCard.module.css';

function formatDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function renderFinancialEntries(financialSummary) {
  if (!financialSummary) {
    return null;
  }

  const entries = Object.entries(financialSummary).filter(([, value]) => value != null && value !== '');

  if (entries.length === 0) {
    return null;
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Financial summary</h2>
      <dl className={styles.financialList}>
        {entries.map(([label, value]) => (
          <div key={label} className={styles.financialItem}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ContactCard({ context }) {
  if (!context) {
    return null;
  }

  const {
    contact = {},
    properties = [],
    appointments = [],
    financialSummary,
    notes,
  } = context;

  const { name, stage, email, phone, avatarUrl, company, preferredAgent, tags, searchFocus } = contact;

  const initials = name
    ? name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('')
    : '?';

  return (
    <div className={styles.card}>
      <header className={styles.header}>
        {avatarUrl ? (
          <img className={styles.avatar} src={avatarUrl} alt={name ? `${name}'s avatar` : 'Contact avatar'} />
        ) : (
          <div className={styles.initials} aria-hidden="true">
            {initials}
          </div>
        )}
        <div className={styles.headerContent}>
          <h1 className={styles.name}>{name || 'Unknown contact'}</h1>
          <div className={styles.metaRow}>
            {stage ? <span className={styles.pill}>{stage}</span> : null}
            {company ? <span className={styles.metaText}>{company}</span> : null}
            {preferredAgent?.name ? <span className={styles.metaText}>Agent: {preferredAgent.name}</span> : null}
          </div>
          {searchFocus ? <p className={styles.searchFocus}>{searchFocus}</p> : null}
        </div>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Contact</h2>
        <div className={styles.contactGrid}>
          {email ? (
            <a className={styles.contactLink} href={`mailto:${email}`}>
              {email}
            </a>
          ) : null}
          {phone ? (
            <a className={styles.contactLink} href={`tel:${phone}`}>
              {phone}
            </a>
          ) : null}
        </div>
        {Array.isArray(tags) && tags.length > 0 ? (
          <ul className={styles.tagList}>
            {tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        ) : null}
      </section>

      {properties.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Associated properties</h2>
          <ul className={styles.propertyList}>
            {properties.map((property) => {
              const key = property.id || property.reference || property.address || property.title;
              return (
                <li key={key} className={styles.propertyItem}>
                  <div className={styles.propertyPrimary}>{property.title || property.address || key}</div>
                  <div className={styles.propertySecondary}>
                    {property.status ? <span>{property.status}</span> : null}
                    {property.price ? <span>{property.price}</span> : null}
                    {property.type ? <span>{property.type}</span> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {appointments.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Upcoming viewings &amp; appointments</h2>
          <ul className={styles.appointmentList}>
            {appointments.map((appointment) => {
              const appointmentDate = appointment.date || appointment.start || appointment.when;
              const parsedDate = appointmentDate ? new Date(appointmentDate) : null;
              const dateLabel = formatDate(parsedDate || appointmentDate);
              const isoDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : undefined;
              const key =
                appointment.id ||
                `${appointmentDate || 'unknown'}-${appointment.property?.id || appointment.summary || 'appt'}`;
              return (
                <li key={key} className={styles.appointmentItem}>
                  <div className={styles.appointmentHeader}>
                    <span className={styles.appointmentType}>{appointment.type || 'Appointment'}</span>
                    {dateLabel && isoDate ? <time dateTime={isoDate}>{dateLabel}</time> : null}
                  </div>
                  <div className={styles.appointmentDetails}>
                    {appointment.property?.title || appointment.property?.address ? (
                      <span>{appointment.property.title || appointment.property.address}</span>
                    ) : null}
                    {appointment.agent?.name ? <span>With {appointment.agent.name}</span> : null}
                    {appointment.summary ? <p>{appointment.summary}</p> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {renderFinancialEntries(financialSummary)}

      {notes ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Notes</h2>
          <p className={styles.notes}>{notes}</p>
        </section>
      ) : null}
    </div>
  );
}

ContactCard.defaultProps = {
  context: null,
};

export default ContactCard;
