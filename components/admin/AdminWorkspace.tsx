import Link from 'next/link';

import styles from '../../styles/AdminWorkspace.module.css';

type WorkspaceLink = {
  href: string;
  label: string;
  description: string;
  meta?: string;
};

type WorkspaceSection = {
  title: string;
  description: string;
  links?: WorkspaceLink[];
  emptyMessage?: string;
};

type AdminWorkspaceProps = {
  badge: string;
  heading: string;
  tagline: string;
  sections: WorkspaceSection[];
};

const AdminWorkspace = ({ badge, heading, tagline, sections }: AdminWorkspaceProps) => {
  return (
    <div className={styles.workspaceContainer}>
      <section className={styles.workspaceHero}>
        <span className={styles.workspaceBadge}>{badge}</span>
        <h1 className={styles.workspaceHeading}>{heading}</h1>
        <p className={styles.workspaceTagline}>{tagline}</p>
      </section>

      <section className={styles.workspacePanels}>
        {sections.map((section) => (
          <article key={section.title} className={styles.workspacePanel}>
            <header className={styles.workspacePanelHeader}>
              <h2 className={styles.workspacePanelTitle}>{section.title}</h2>
              <p className={styles.workspacePanelDescription}>{section.description}</p>
            </header>

            {section.links && section.links.length > 0 ? (
              <ul className={styles.workspaceList}>
                {section.links.map((link) => (
                  <li key={`${section.title}-${link.href}`} className={styles.workspaceListItem}>
                    <Link href={link.href} className={styles.workspaceListLink}>
                      <span className={styles.workspaceListLabel}>{link.label}</span>
                      <p className={styles.workspaceListDescription}>{link.description}</p>
                      {link.meta ? <span className={styles.workspaceMeta}>{link.meta}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : section.emptyMessage ? (
              <div className={styles.workspaceEmpty}>{section.emptyMessage}</div>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
};

export type { WorkspaceLink as AdminWorkspaceLink, WorkspaceSection as AdminWorkspaceSection };

export default AdminWorkspace;
