import { fetchPropertyById } from '../../lib/apex27';

export default function Property({ property }) {
  if (!property) return <div>Property not found</div>;
  return (
    <main>
      <h1>{property.title}</h1>
      {property.image && <img src={property.image} alt={property.title} />}
      <p>{property.description}</p>
      <p>{property.price}</p>
    </main>
  );
}

export async function getServerSideProps({ params }) {
  const property = await fetchPropertyById(params.id);
  return { props: { property } };
}
