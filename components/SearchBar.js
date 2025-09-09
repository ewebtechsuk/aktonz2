import styles from '../styles/Home.module.css';

export default function SearchBar() {
  return (
    <form className={styles.searchBar} onSubmit={(e) => e.preventDefault()}>
      <input type="text" placeholder="Search area or postcode" />
      <button type="submit">Search</button>
    </form>
  );
}
