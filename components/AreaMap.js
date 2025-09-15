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
    let mainLayers = [];
    let subLayers = [];

    const generateGrid = (bounds, rows, cols, prefix) => {
      const { north, south, west, east } = bounds;
      const latStep = (north - south) / rows;
      const lonStep = (east - west) / cols;
      const areas = [];
      let idx = 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          areas.push({
            name: `${prefix}${idx}`,
            slug: `${prefix}${idx}`.toLowerCase(),
            coords: [
              [north - r * latStep, west + c * lonStep],
              [north - r * latStep, west + (c + 1) * lonStep],
              [north - (r + 1) * latStep, west + (c + 1) * lonStep],
              [north - (r + 1) * latStep, west + c * lonStep],
            ],
          });
          idx++;
        }
      }
      return areas;
    };


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
          slug: 'north-london',
          coords: [
            [51.7, -0.15],
            [51.7, 0.1],
            [51.56, 0.1],
            [51.56, -0.15],
          ],
        },
        {
          name: 'North West London',
          slug: 'northwest-london',
          coords: [
            [51.7, -0.5],
            [51.7, -0.15],
            [51.56, -0.15],
            [51.56, -0.5],
          ],
        },
        {
          name: 'West London',
          slug: 'west-london',
          coords: [
            [51.56, -0.5],
            [51.56, -0.2],
            [51.49, -0.2],
            [51.49, -0.5],
          ],
        },
        {
          name: 'South West London',
          slug: 'southwest-london',
          coords: [
            [51.49, -0.5],
            [51.49, -0.1],
            [51.3, -0.1],
            [51.3, -0.5],
          ],
        },
        {
          name: 'South East London',
          slug: 'southeast-london',
          coords: [
            [51.49, -0.1],
            [51.49, 0.25],
            [51.3, 0.25],
            [51.3, -0.1],

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
            [51.56, 0.35],
            [51.52, 0.35],
            [51.49, 0.3],

            [51.49, 0.05],
            [51.5, -0.03],
            [51.51, -0.05],
            [51.53, -0.07],
            [51.56, -0.07],

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

      const subAreas = {
        'east-london': (() => {
          const grid = generateGrid(
            { north: 51.6, south: 51.35, west: -0.1, east: 0.3 },
            4,
            5,
            'E'
          );
          grid.push(
            {
              name: 'Ilford',
              slug: 'ilford',
              coords: [
                [51.56, 0.3],
                [51.56, 0.35],
                [51.52, 0.35],
                [51.52, 0.3],
              ],
            },
            {
              name: 'Barking',
              slug: 'barking',
              coords: [
                [51.52, 0.3],
                [51.52, 0.35],
                [51.49, 0.35],
                [51.49, 0.3],
              ],
            },
            {
              name: 'Dagenham',
              slug: 'dagenham',
              coords: [
                [51.49, 0.3],
                [51.49, 0.35],
                [51.46, 0.35],
                [51.46, 0.3],
              ],
            }
          );
          return grid;
        })(),
      };

      const drawMain = () => {
        mainLayers = shapes.map((s) => {
          const slug = findSlug(s.name) || s.slug;
          if (!slug) return null;

          const polygon = L.polygon(s.coords, {
            color: '#2262CC',
            weight: 1,
            fillOpacity: 0.2,
          })
            .addTo(map)
            .on('click', () => {
              const subs = subAreas[slug];
              if (subs) {
                drawSub(slug);
              } else {
                router.push(`/area-guides/${slug}`);
              }
            });

          polygon.bindTooltip(s.name.replace(/ London$/i, ''), {
            permanent: true,
            direction: 'center',
            className: styles.mapTooltip,
          });

          return polygon;
        }).filter(Boolean);
      };

      const drawSub = (slug) => {
        mainLayers.forEach((l) => map.removeLayer(l));
        subLayers.forEach((l) => map.removeLayer(l));

        const subs = subAreas[slug];
        if (!subs) return;

        const group = L.featureGroup();

        subLayers = subs.map((s) => {
          const subSlug = findSlug(s.name) || s.slug;

          const polygon = L.polygon(s.coords, {
            color: '#2262CC',
            weight: 1,
            fillOpacity: 0.2,
          })
            .addTo(map)
            .on('click', () => router.push(`/area-guides/${subSlug}`));

          polygon.bindTooltip(s.name, {
            permanent: true,
            direction: 'center',
            className: styles.mapTooltip,
          });

          group.addLayer(polygon);
          return polygon;
        });

        map.fitBounds(group.getBounds());
      };

      drawMain();

    }

    initMap();

    return () => {
      if (map) map.remove();
    };
  }, [regions, router]);

  return <div id="area-map" className={styles.map} />;
}
