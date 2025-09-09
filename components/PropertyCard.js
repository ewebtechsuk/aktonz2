export default function PropertyCard({ property }) {
  return (
    <div className="property-card">
      <h2>{property.title}</h2>
      {property.image && <img src={property.image} alt={property.title} />}
      <p>{property.price}</p>
    </div>
  );
}
