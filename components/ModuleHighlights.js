import styles from '../styles/Home.module.css';

const modules = [
  {
    icon: '🧭',
    title: 'Client onboarding',
    description:
      'Automatically assemble personal landing pages with bios, testimonials and explainer videos to set the tone before you arrive.',
    capabilities: ['CRM sync keeps content current', 'Role-based templates for valuers, lettings and marketing']
  },
  {
    icon: '📱',
    title: 'Live appraisal toolkit',
    description:
      'Access dynamic comparables, pricing models and buyer demand visualisations across tablet, laptop or mobile in seconds.',
    capabilities: ['Offline cache for low-connectivity homes', 'One-tap exports for leave-behind collateral']
  },
  {
    icon: '🔔',
    title: 'Engagement automation',
    description:
      'Real-time notifications flow to negotiators when proposals are opened, notes are added or new decision-makers join the journey.',
    capabilities: ['SMS, email and task assignments with audit trails', 'Performance dashboards to coach teams on follow-up discipline']
  }
];

export default function ModuleHighlights() {
  return (
    <section className={styles.modules}>
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>Core Platform</p>
        <h2>Everything your appraisal team needs in one place</h2>
        <p>
          Deploy the modules you need today and scale into new experiences as
          your instruction targets evolve. Aktonz slots into your existing tech
          stack with secure integrations and a flexible API.
        </p>
      </div>
      <div className={styles.modulesGrid}>
        {modules.map((module) => (
          <article className={styles.moduleCard} key={module.title}>
            <span className={styles.moduleIcon}>{module.icon}</span>
            <h3>{module.title}</h3>
            <p>{module.description}</p>
            <ul>
              {module.capabilities.map((capability) => (
                <li key={capability}>{capability}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
