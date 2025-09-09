import PropertyList from '../components/PropertyList';
import { fetchProperties } from '../lib/apex27';

export default function Home({ properties }) {
  return (
    <main>
      <h1>Property Listings</h1>
      <PropertyList properties={properties} />
    </main>
  );
}

export async function getStaticProps() {
  const properties = await fetchProperties();
  return { props: { properties } };
}
