import { useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/AreaGuides.module.css';

export default function AreaMap({ regions = [] }) {
  const router = useRouter();

  const findSlug = (name) => {
    const base = name.replace(/ London$/i, '').toLowerCase();
    const match = regions.find(
      (r) => r.name.replace(/ London$/i, '').toLowerCase() === base
    );
    return match ? match.slug : null;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let map;

    async function initMap() {
      const L = (await import('leaflet')).default;

      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      map = L.map('area-map', {
        zoomControl: false,
        scrollWheelZoom: false,
      }).setView([51.5, -0.1], 10);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const shapes = [
        {
          name: 'North London',

          coords: [
            [51.7, -0.45],
            [51.7, 0.1],
            [51.56, 0.1],
            [51.56, -0.45],
          ],
        },
        {
          name: 'South London',
          slug: 'south-london',

          coords: [
            [51.56, -0.4],
            [51.56, 0.1],
            [51.3, 0.1],
            [51.3, -0.4],
          ],
        },
        {
          name: 'East London',
          slug: 'east-london',

          coords: [
            [51.56, -0.07],
            [51.6, -0.02],
            [51.63, 0.05],
            [51.6, 0.1],
            [51.6, 0.15],
            [51.57, 0.2],
            [51.56, 0.28],
            [51.52, 0.3],
            [51.49, 0.25],
            [51.49, 0.05],
            [51.5, -0.03],
            [51.51, -0.05],
            [51.53, -0.07],
            [51.56, -0.07],

          ],
        },
        {
          name: 'West London',
          slug: 'west-london',

          coords: [
            [51.56, -0.5],
            [51.56, -0.2],
            [51.3, -0.2],
            [51.3, -0.5],
          ],
        },
        {
          name: 'Central London',
          slug: 'central-london',

          coords: [
            [51.52, -0.15],
            [51.52, 0.05],
            [51.47, 0.05],
            [51.47, -0.15],
          ],
        },
      ];

      shapes.forEach((s) => {
        const slug = findSlug(s.name) || s.slug;

        if (!slug) return;

        const polygon = L.polygon(s.coords, {
          color: '#2262CC',
          weight: 1,
          fillOpacity: 0.2,
        })
          .addTo(map)
          .on('click', () => router.push(`/area-guides/${slug}`));

        polygon.bindTooltip(s.name.replace(/ London$/i, ''), {
          permanent: true,
          direction: 'center',
          className: styles.mapTooltip,
        });
      });
    }

    initMap();

    return () => {
      if (map) map.remove();
    };
  }, [regions, router]);

  return <div id="area-map" className={styles.map} />;
}
