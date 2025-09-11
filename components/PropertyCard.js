import ImageSlider from './ImageSlider';

export default function PropertyCard({ property }) {
  const status = property.status ? property.status.replace(/_/g, ' ') : null;
  return (
    <div className="property-card">
      <div className="image-wrapper">
        {property.images && property.images.length > 0 ? (
          <ImageSlider
            images={property.images}
            imgStyle={{
              width: '100%',
              height: '200px',
              objectFit: 'cover',
              display: 'block',
              border: 0,
            }}
          />
        ) : (
          property.image && <img src={property.image} alt={property.title} />
        )}
        {status && <span className="status-badge">{status}</span>}
      </div>
      <div className="details">
        <h3 className="title">{property.title}</h3>
        {property.price && <p className="price">{property.price}</p>}
        {property.description && (
          <p className="description">{property.description}</p>
        )}
      </div>
    </div>
  );
}
