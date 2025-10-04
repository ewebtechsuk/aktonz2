import {
  FaLeaf,
  FaClipboardCheck,
  FaBolt,
  FaFire,
  FaTint,
  FaWifi,
  FaReceipt,
  FaTv,
} from 'react-icons/fa';
import styles from '../styles/PropertyDetails.module.css';

const UTILITY_CONFIG = [
  {
    key: 'all',
    label: 'All bills',
    Icon: FaClipboardCheck,
    tooltip: 'Rent includes all utility bills.',
  },
  {
    key: 'electricity',
    label: 'Electricity',
    Icon: FaBolt,
    tooltip: 'Electricity charges are included in the rent.',
  },
  {
    key: 'gas',
    label: 'Gas',
    Icon: FaFire,
    tooltip: 'Gas charges are included in the rent.',
  },
  {
    key: 'water',
    label: 'Water',
    Icon: FaTint,
    tooltip: 'Water charges are included in the rent.',
  },
  {
    key: 'internet',
    label: 'Internet & Wi-Fi',
    Icon: FaWifi,
    tooltip: 'Internet access is included in the rent.',
  },
  {
    key: 'councilTax',
    label: 'Council tax',
    Icon: FaReceipt,
    tooltip: 'Council tax is covered by the rent.',
  },
  {
    key: 'tvLicence',
    label: 'TV licence',
    Icon: FaTv,
    tooltip: 'TV licence fees are included in the rent.',
  },
];

function formatCouncilTaxBand(band) {
  if (!band) {
    return 'Not provided';
  }

  const trimmed = band.trim();
  if (!trimmed) {
    return 'Not provided';
  }

  if (/^band/i.test(trimmed)) {
    return trimmed.replace(/^band/i, 'Band').replace(/\s+/g, ' ');
  }

  if (/^[A-H]$/i.test(trimmed)) {
    return `Band ${trimmed.toUpperCase()}`;
  }

  return trimmed;
}

export default function PropertySustainabilityPanel({ property }) {
  if (!property) {
    return null;
  }

  const epcScore = property.epcScore;
  const councilTaxBand = property.councilTaxBand;
  const utilities = property.includedUtilities || {};

  const epcLabel = epcScore ? epcScore : 'Not provided';
  const councilTaxLabel = formatCouncilTaxBand(councilTaxBand);

  const includedUtilities = UTILITY_CONFIG.filter(({ key }) => utilities[key] === true);
  const hasIncludedUtilities = includedUtilities.length > 0;
  const hasExplicitExclusion = UTILITY_CONFIG.some(({ key }) => utilities[key] === false);

  let utilitiesFallback = 'Utilities information not provided';
  if (hasExplicitExclusion && !hasIncludedUtilities) {
    utilitiesFallback = 'No utilities included in the rent';
  }

  return (
    <section className={styles.sustainabilityPanel} aria-labelledby="property-sustainability-heading">
      <h2 id="property-sustainability-heading">Energy &amp; running costs</h2>
      <div className={styles.sustainabilityGrid}>
        <div className={styles.sustainabilityItem} title="Energy Performance Certificate rating">
          <FaLeaf className={styles.sustainabilityIcon} aria-hidden="true" />
          <div>
            <p className={styles.sustainabilityLabel}>EPC rating</p>
            <p className={styles.sustainabilityValue}>{epcLabel}</p>
          </div>
        </div>
        <div className={styles.sustainabilityItem} title="Council tax band for this property">
          <FaReceipt className={styles.sustainabilityIcon} aria-hidden="true" />
          <div>
            <p className={styles.sustainabilityLabel}>Council tax band</p>
            <p className={styles.sustainabilityValue}>{councilTaxLabel}</p>
          </div>
        </div>
        <div className={styles.sustainabilityItem} title="Utilities included in the rent">
          <FaClipboardCheck className={styles.sustainabilityIcon} aria-hidden="true" />
          <div>
            <p className={styles.sustainabilityLabel}>Included utilities</p>
            {hasIncludedUtilities ? (
              <ul className={styles.utilityList}>
                {includedUtilities.map(({ key, label, Icon, tooltip }) => (
                  <li key={key} className={styles.utilityTag} title={tooltip}>
                    <Icon className={styles.utilityIcon} aria-hidden="true" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.sustainabilityValue}>{utilitiesFallback}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
