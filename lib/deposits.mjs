import deposits from './deposits.cjs';

export const {
  calculateWeeklyRent,
  calculateMonthlyRent,
  normalizeDeposit,
  formatDepositDisplay,
  resolveAvailabilityDate,
  formatAvailabilityDate,
} = deposits;

export default deposits;
