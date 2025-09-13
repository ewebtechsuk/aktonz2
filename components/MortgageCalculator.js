import { useState } from 'react';
import styles from '../styles/Calculator.module.css';

export default function MortgageCalculator({ defaultPrice = 0 }) {
  const [price, setPrice] = useState(defaultPrice);
  const [deposit, setDeposit] = useState(0);
  const [rate, setRate] = useState(3);
  const [term, setTerm] = useState(25);

  const principal = Math.max(price - deposit, 0);
  const monthlyRate = rate / 100 / 12;
  const months = term * 12;
  const monthlyPayment =
    monthlyRate === 0
      ? principal / months
      :
        (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
        (Math.pow(1 + monthlyRate, months) - 1);

  return (
    <div className={styles.calculator}>
      <label htmlFor="propertyPrice">
        Property price
        <input
          id="propertyPrice"
          name="propertyPrice"
          type="number"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          autoComplete="off"
        />
      </label>
      <label htmlFor="depositAmount">
        Deposit
        <input
          id="depositAmount"
          name="depositAmount"
          type="number"
          value={deposit}
          onChange={(e) => setDeposit(Number(e.target.value))}
          autoComplete="off"
        />
      </label>
      <label htmlFor="interestRate">
        Interest rate (%)
        <input
          id="interestRate"
          name="interestRate"
          type="number"
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          autoComplete="off"
        />
      </label>
      <label htmlFor="termYears">
        Term (years)
        <input
          id="termYears"
          name="termYears"
          type="number"
          value={term}
          onChange={(e) => setTerm(Number(e.target.value))}
          autoComplete="off"
        />
      </label>
      <div className={styles.result}>
        Monthly payment: £{isFinite(monthlyPayment) ? monthlyPayment.toFixed(2) : '0.00'}
      </div>
    </div>
  );
}

