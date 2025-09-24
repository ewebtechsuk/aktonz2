import styles from '../styles/Home.module.css';

const stages = [
  {
    title: 'Pre-appointment warmups',
    summary:
      'Dynamic microsites, local insights and tailored intros delivered the moment a valuation is booked.',
    bullets: [
      'Personalised videos and agent bios auto-populated from your CRM.',
      'Automated reminder cadence with content timed to the appointment.'
    ]
  },
  {
    title: 'In-meeting toolkit',
    summary:
      'Bring compelling market evidence to every conversation with responsive visuals that adapt in real time.',
    bullets: [
      'Touch-friendly storyboards with comparables, buyer demand and timelines.',
      'Offline-ready so negotiators can present without worrying about connectivity.'
    ]
  },
  {
    title: 'Post-appraisal proposals',
    summary:
      'Branded digital proposals with built-in e-signatures help clients decide faster and stay informed.',
    bullets: [
      'Track opens, dwell time and objections directly inside your dashboard.',
      'Trigger SMS nudges for negotiators when a client is ready to talk.'
    ]
  },
  {
    title: 'Long-term nurturing',
    summary:
      'Keep the pipeline warm with relevant updates that prove your expertise long after the appointment.',
    bullets: [
      'Automated market digests and success stories based on location and property type.',
      'Re-engagement journeys tuned to anniversaries, price changes and buyer activity.'
    ]
  }
];

export default function LifecycleShowcase() {
  return (
    <section className={styles.lifecycle}>
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>Lifecycle Messaging</p>
        <h2>Guide vendors from first impression to instruction</h2>
        <p>
          Aktonz packages your expertise into a connected series of touchpoints so
          prospects never fall through the cracks. Each stage is engineered to
          deliver clarity, build trust and spark timely conversations.
        </p>
      </div>
      <div className={styles.lifecycleGrid}>
        {stages.map((stage, index) => (
          <article className={styles.lifecycleCard} key={stage.title}>
            <span className={styles.lifecycleStep}>{index + 1}</span>
            <h3>{stage.title}</h3>
            <p>{stage.summary}</p>
            <ul>
              {stage.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
