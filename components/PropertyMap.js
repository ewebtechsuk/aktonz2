import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { formatPropertyPriceLabel } from '../lib/rent.js';
import styles from '../styles/PropertyMap.module.css';

export default function PropertyMap({
  properties = [],
  center = [51.5, -0.1],
  zoom = 12,
  mapId = 'property-map',
}) {
  const router = useRouter();
  const [interactive, setInteractive] = useState(false);
  const centerKey = Array.isArray(center) ? center.join(',') : '';
  const propertiesKey = JSON.stringify(
    properties.map((p) => ({
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      price: p.price,
      rentFrequency: p.rentFrequency,
      tenure: p.tenure,
      image: p.image,
      title: p.title,
      propertyType: p.propertyType,
    }))
  );

  useEffect(() => {
    if (!interactive) return;
    if (typeof window === 'undefined') return;

    let map;
    async function initMap() {
      const L = (await import('leaflet')).default;

      // Configure default icon paths so markers appear correctly
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const getIcon = (type) => {
        const t = String(type || '').toLowerCase();
        const isFlat = t.includes('flat') || t.includes('apartment');
        const emoji = isFlat ? '🏢' : '🏠';
        return L.divIcon({
          className: '',
          html: `<div style="font-size:24px;">${emoji}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 24],
        });
      };

      const container = document.getElementById(mapId);
      if (!container) {
        return;
      }

      map = L.map(mapId).setView(center, zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      properties.forEach((p) => {
        if (typeof p.lat === 'number' && typeof p.lng === 'number') {
          const marker = L.marker([p.lat, p.lng], {
            icon: getIcon(p.propertyType),
          }).addTo(map);

          const priceText = (() => {
            const basePrice = formatPropertyPriceLabel(p);
            if (!basePrice) {
              return '';
            }
            if (!p.rentFrequency && p.tenure) {
              return `${basePrice} ${p.tenure}`;
            }
            return basePrice;
          })();

          const imgHtml = p.image
            ? `<img src="${p.image}" alt="${p.title}" style="width:100px;height:auto;display:block;"/>`
            : '';

          const popupHtml = `<a href="${router.basePath}/property/${p.id}" style="text-decoration:none;">${imgHtml}<strong>${p.title}</strong><br/>${priceText}</a>`;
          marker.bindPopup(popupHtml);
        }
      });
    }

    initMap();

    return () => {
      if (map) map.remove();
    };
  }, [interactive, propertiesKey, centerKey, zoom, router.basePath, mapId]);

  const enableInteraction = useCallback(() => {
    setInteractive(true);
  }, []);

  const handleOverlayKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setInteractive(true);
      }
    },
    []
  );

  return (
    <div className={styles.mapWrapper}>
      <div
        id={mapId}
        className={`${styles.map} ${!interactive ? styles.mapDisabled : ''}`}
        aria-hidden={!interactive}
      />
      {!interactive && (
        <button
          type="button"
          role="button"
          className={styles.overlayButton}
          onClick={enableInteraction}
          onKeyDown={handleOverlayKeyDown}
          aria-label="Enable interactive map"
        >
          <span className={styles.overlayLabel}>Enable interactive map</span>
          <span className={styles.overlayTooltip}>Click to explore the map</span>
        </button>
      )}
    </div>
  );
}
