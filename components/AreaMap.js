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

  const formatLabel = (name) => {
    if (!name) return '';
    const withoutLondon = name.replace(/\bLondon\b/gi, '').trim();
    if (!withoutLondon) return 'LON';

    const parts = withoutLondon
      .split(/[^A-Za-z]+/)
      .filter(Boolean)
      .map((word) => word[0]);

    if (parts.length === 0) return withoutLondon.slice(0, 3).toUpperCase();

    return parts.join('').toUpperCase();
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let map;
    let mainLayers = [];
    let subLayers = [];
    let resetControl;

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

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution:
          '&copy; <a href="https://carto.com/attributions">CARTO</a>, © OpenStreetMap contributors',
      }).addTo(map);

      const shapes = mapData.mainRegions;
      const subAreas = mapData.subRegions;

      const baseStyle = {
        color: '#0a7c3b',
        weight: 3,
        fillColor: '#e6f5eb',
        fillOpacity: 0.6,
      };

      const bindHover = (layer) => {
        layer.on('mouseover', () =>
          layer.setStyle({ ...baseStyle, fillOpacity: 0.75, weight: 4 })
        );
        layer.on('mouseout', () => layer.setStyle(baseStyle));
      };

      const ensureResetControl = () => {
        if (!resetControl) {
          resetControl = L.control({ position: 'topright' });
          resetControl.onAdd = () => {
            const container = L.DomUtil.create('div', styles.mapControl);
            const button = L.DomUtil.create('button', styles.mapControlButton, container);
            button.type = 'button';
            button.textContent = 'Back to London regions';
            button.addEventListener('click', (event) => {
              event.preventDefault();
              drawMain();
            });
            L.DomEvent.disableClickPropagation(container);
            return container;
          };
        }

        resetControl.addTo(map);
      };

      const removeResetControl = () => {
        if (resetControl) {
          map.removeControl(resetControl);
        }
      };

      const drawMain = () => {
        subLayers.forEach((layer) => map.removeLayer(layer));
        subLayers = [];
        mainLayers.forEach((layer) => map.removeLayer(layer));
        const group = L.featureGroup();

        removeResetControl();

        mainLayers = shapes.map((s) => {
          const regionSlug = s.slug;
          const targetSlug = findSlug(s.name) || regionSlug;

          const polygon = L.polygon(s.coords, baseStyle)
            .addTo(map)
            .on('click', () => {
              const subs = subAreas[regionSlug];
              if (subs) {
                drawSub(regionSlug);
              } else {
                router.push(`/area-guides/${targetSlug}`);
              }
            });

          bindHover(polygon);

          polygon.bindTooltip(formatLabel(s.name), {
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

        ensureResetControl();

        subLayers = subs.map((s) => {
          const subSlug = findSlug(s.name) || s.slug;

          const polygon = L.polygon(s.coords, baseStyle)
            .addTo(map)
            .on('click', () => router.push(`/area-guides/${subSlug}`));

          bindHover(polygon);

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
      resetControl = null;
    };
  }, [regions, router]);

  return <div id="area-map" className={styles.map} />;
}
