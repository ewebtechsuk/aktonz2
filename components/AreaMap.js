import { useEffect } from 'react';
import { useRouter } from 'next/router';
import mapData from '../data/area-map.json';
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

      const shapes = mapData.mainRegions;
      const subAreas = mapData.subRegions;

      const drawMain = () => {
        subLayers.forEach((layer) => map.removeLayer(layer));
        subLayers = [];
        mainLayers.forEach((layer) => map.removeLayer(layer));
        const group = L.featureGroup();

        mainLayers = shapes.map((s) => {
          const regionSlug = s.slug;
          const targetSlug = findSlug(s.name) || regionSlug;

          const polygon = L.polygon(s.coords, {
            color: '#2262CC',
            weight: 1,
            fillOpacity: 0.2,
          })
            .addTo(map)
            .on('click', () => {
              const subs = subAreas[regionSlug];
              if (subs) {
                drawSub(regionSlug);
              } else {
                router.push(`/area-guides/${targetSlug}`);
              }
            });

          polygon.bindTooltip(s.name.replace(/ London$/i, ''), {
            permanent: true,
            direction: 'center',
            className: styles.mapTooltip,
          });

          group.addLayer(polygon);
          return polygon;
        }).filter(Boolean);

        if (group.getLayers().length > 0) {
          map.fitBounds(group.getBounds(), { padding: [20, 20] });
        }
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

        map.fitBounds(group.getBounds(), { padding: [20, 20] });
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
