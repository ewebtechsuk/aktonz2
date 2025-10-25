import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import styles from '../styles/PropertyDetails.module.css';

function SectionNav({ sections }) {
  const [activeId, setActiveId] = useState(() => sections.find((section) => section.id)?.id ?? null);

  const validSections = useMemo(
    () => sections.filter((section) => section && section.id && section.label),
    [sections]
  );

  useEffect(() => {
    setActiveId((previous) => {
      if (validSections.some((section) => section.id === previous)) {
        return previous;
      }
      return validSections[0]?.id ?? null;
    });
  }, [validSections]);

  useEffect(() => {
    if (typeof window === 'undefined' || validSections.length === 0) {
      return undefined;
    }

    const observedElements = validSections
      .map((section) => document.getElementById(section.id))
      .filter((element) => Boolean(element));

    if (observedElements.length === 0) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.target.offsetTop - b.target.offsetTop);

        if (intersecting.length > 0) {
          const nextActiveId = intersecting[0].target.id;
          setActiveId((previous) => (previous === nextActiveId ? previous : nextActiveId));
          return;
        }

        const viewportReference = window.innerHeight * 0.4;
        const closest = observedElements
          .map((element) => ({
            id: element.id,
            top: element.getBoundingClientRect().top,
          }))
          .sort((a, b) => a.top - b.top)
          .reduce((current, candidate) => {
            if (candidate.top <= viewportReference) {
              return candidate;
            }
            return current;
          }, null);

        if (closest?.id) {
          setActiveId((previous) => (previous === closest.id ? previous : closest.id));
        }
      },
      {
        rootMargin: '-45% 0px -45% 0px',
        threshold: [0, 0.2, 0.4, 0.6, 0.8, 1],
      }
    );

    observedElements.forEach((element) => observer.observe(element));

    const handleScroll = () => {
      const offset =
        window.scrollY + window.innerHeight * 0.3;
      let matchedId = observedElements[0]?.id ?? null;

      for (const element of observedElements) {
        if (element.offsetTop <= offset) {
          matchedId = element.id;
        }
      }

      if (matchedId) {
        setActiveId((previous) => (previous === matchedId ? previous : matchedId));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observedElements.forEach((element) => observer.unobserve(element));
      observer.disconnect();
    };
  }, [validSections]);

  if (validSections.length === 0) {
    return null;
  }

  return (
    <nav
      className={`${styles.contentRail} ${styles.sectionNav}`}
      aria-label="Property sections"
    >
      <div className={styles.sectionNavInner}>
        <ul className={styles.sectionNavList}>
          {validSections.map((section) => {
            const isActive = activeId === section.id;
            return (
              <li key={section.id} className={styles.sectionNavItem}>
                <a
                  href={`#${section.id}`}
                  className={`${styles.sectionNavLink} ${
                    isActive ? styles.sectionNavLinkActive : ''
                  }`}
                >
                  {section.label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

SectionNav.propTypes = {
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
};

SectionNav.defaultProps = {
  sections: [],
};

export default SectionNav;
