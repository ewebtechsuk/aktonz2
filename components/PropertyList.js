import Link from 'next/link';
import PropertyCard from './PropertyCard';

export default function PropertyList({ properties }) {
  return (
    <div className="property-list">
      {properties.map((p) => (
        <Link href={`/property/${p.id}`} key={p.id} legacyBehavior>
          <a className="property-link">
            <PropertyCard property={p} />
          </a>
        </Link>
      ))}
    </div>
  );
}
