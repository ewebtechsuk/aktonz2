import { useRouter } from 'next/router';
import styles from '../styles/AreaGuides.module.css';

export default function AreaMap({ regions }) {
  const router = useRouter();
  const findSlug = (name) => {
    const match = regions.find((r) => r.name.toLowerCase() === name.toLowerCase());
    return match ? match.slug : null;
  };

  const shapes = [
    { name: 'North London', x: 120, y: 0, w: 160, h: 80 },
    { name: 'South London', x: 120, y: 120, w: 160, h: 80 },
    { name: 'East London', x: 260, y: 80, w: 140, h: 80 },
    { name: 'West London', x: 0, y: 80, w: 140, h: 80 },
    { name: 'Central London', x: 150, y: 80, w: 100, h: 80 },
  ];

  return (
    <svg viewBox="0 0 400 200" className={styles.map} role="img" aria-label="London areas map">
      {shapes.map((s) => {
        const slug = findSlug(s.name);
        if (!slug) return null;
        const label = s.name.replace(/\s+London$/i, '');
        return (
          <g
            key={s.name}
            className={styles.mapRegion}
            onClick={() => router.push(`/area-guides/${slug}`)}
          >
            <rect x={s.x} y={s.y} width={s.w} height={s.h} />
            <text
              x={s.x + s.w / 2}
              y={s.y + s.h / 2}
              className={styles.mapLabel}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
