import { fetchPropertyById, fetchProperties } from '../../lib/apex27';

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

export async function getStaticPaths() {
  const properties = await fetchProperties();
  return {
    paths: properties.map((p) => ({ params: { id: p.id } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const property = await fetchPropertyById(params.id);
  return { props: { property } };
}
