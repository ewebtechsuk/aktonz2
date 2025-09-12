import { useState } from 'react';
import styles from '../styles/Calculator.module.css';

export default function RentAffordability({ defaultRent = 0 }) {
  const [income, setIncome] = useState(0);
  const [rent, setRent] = useState(defaultRent);

  const ratio = income > 0 ? (rent / income) * 100 : 0;
  const recommended = income * 0.3;

  return (
    <div className={styles.calculator}>
      <label>
        Monthly income
        <input
          type="number"
          value={income}
          onChange={(e) => setIncome(Number(e.target.value))}
        />
      </label>
      <label>
        Monthly rent
        <input
          type="number"
          value={rent}
          onChange={(e) => setRent(Number(e.target.value))}
        />
      </label>
      {income > 0 && (
        <div className={styles.result}>
          <p>Rent is {ratio.toFixed(1)}% of income.</p>
          <p>Recommended max rent: £{recommended.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}

