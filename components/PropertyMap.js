import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';

export default function PropertyMap({ properties = [], center = [51.5, -0.1], zoom = 12 }) {
  useEffect(() => {
    let map;
    async function initMap() {
      const L = (await import('leaflet')).default;

      // Configure default icon paths so markers appear correctly
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      map = L.map('property-map').setView(center, zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      properties.forEach((p) => {
        if (typeof p.lat === 'number' && typeof p.lng === 'number') {
          L.marker([p.lat, p.lng]).addTo(map).bindPopup(`<strong>${p.title}</strong>`);
        }
      });
    }

    initMap();

    return () => {
      if (map) map.remove();
    };
  }, [properties, center, zoom]);

  return <div id="property-map" style={{ height: '500px', width: '100%' }} />;
}
