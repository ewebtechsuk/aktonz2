import Link from 'next/link';

import AccountLayout from '../../components/account/AccountLayout';
import styles from '../../styles/Account.module.css';

const BEDROOM_OPTIONS = [
  { label: 'Studio' },
  { label: '1' },
  { label: '2', active: true },
  { label: '3' },
  { label: '4+' },
];

const PROPERTY_TYPES = [
  { label: 'Apartment', active: true },
  { label: 'House', active: true },
  { label: 'Loft' },
  { label: 'Townhouse' },
  { label: 'New build' },
];

const FEATURE_TAGS = [
  { label: 'Outside space', active: true },
  { label: 'Pet friendly', active: true },
  { label: 'Parking' },
  { label: 'Home office' },
  { label: 'Concierge' },
  { label: 'Gym access' },
];

const TENANCY_LENGTHS = [
  { label: '6 months' },
  { label: '12 months', active: true },
  { label: '18 months' },
  { label: '24 months' },
  { label: 'Flexible' },
];

const MOVE_IN_TIMES = [
  { label: 'Immediately' },
  { label: 'Within 1 month' },
  { label: '1-3 months', active: true },
  { label: '3-6 months' },
  { label: '6+ months' },
];

const FURNISHING_OPTIONS = [
  { label: 'Furnished', active: true },
  { label: 'Part furnished' },
  { label: 'Unfurnished' },
];

const PET_PREFERENCES = [
  { label: 'No pets' },
  { label: 'Cat friendly', active: true },
  { label: 'Dog friendly' },
];

const FLEXIBILITY_CARDS = [
  {
    title: 'How flexible are you?',
    description:
      'Would you like us to highlight homes slightly outside of your chosen neighbourhoods if they meet the rest of your requirements?',
    options: [
      { label: 'Stick to my areas' },
      { label: 'Show nearby too', active: true },
      { label: 'Cast a wider net' },
    ],
  },
  {
    title: 'What about condition?',
    description:
      'Let us know how you feel about properties that may need a light refresh so we can widen your shortlist when it makes sense.',
    options: [
      { label: 'Only turnkey' },
      { label: 'Happy with light works', active: true },
      { label: 'Open to refurb projects' },
    ],
  },
];

const AREA_TAGS = [
  { label: 'Shoreditch', active: true },
  { label: 'Islington', active: true },
  { label: 'Hackney', active: true },
  { label: 'Highbury' },
  { label: 'Canonbury' },
];

const BUDGET_MIN_OPTIONS = ['£1,500 pcm', '£1,750 pcm', '£1,900 pcm', '£2,100 pcm'];
const BUDGET_MAX_OPTIONS = ['£2,400 pcm', '£2,750 pcm', '£3,000 pcm', '£3,250 pcm', '£3,500 pcm'];
const SELECTED_MIN = '£1,900 pcm';
const SELECTED_MAX = '£3,000 pcm';

export default function AccountDashboard() {
  return (
    <AccountLayout
      heroSubtitle="Insights. Information. Control."
      heroTitle="My lettings search"
      heroDescription="London lettings is competitive but we are here to give you an advantage."
      heroCta={{
        label: "Let's get started",
        href: '/to-rent',
        secondary: { label: 'Talk to my team', href: '/contact' },
      }}
    >
      <section className={styles.searchCard}>
        <header className={styles.cardHeader}>
          <div>
            <h2>Register with us to jump the queue</h2>
            <p>
              Tell us the essentials so your dedicated lettings team can share tailored listings the moment they launch.
            </p>
          </div>
          <Link href="/account/profile" className={styles.primaryAction}>
            Update my preferences
          </Link>
        </header>

        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <div>
              <h3 className={styles.fieldTitle}>Select the areas you're interested in</h3>
              <p className={styles.fieldDescription}>Search by neighbourhood, station or postcode.</p>
            </div>
            <label className={styles.inputShell}>
              <span className={styles.inputIcon}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M9 10.875A3.375 3.375 0 1 0 9 4.125a3.375 3.375 0 0 0 0 6.75Zm0 6.188c2.25-2.531 5.625-5.531 5.625-8.438A5.625 5.625 0 0 0 9 3 5.625 5.625 0 0 0 3.375 8.625c0 2.906 3.375 5.906 5.625 8.438Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <input className={styles.textInput} type="text" placeholder="Search areas, stations or postcodes" />
            </label>
            <p className={styles.helperText}>Add at least three areas so we can cross-match new launches instantly.</p>
          </div>

          <div className={styles.formField}>
            <div>
              <h3 className={styles.fieldTitle}>How many bedrooms?</h3>
              <p className={styles.fieldDescription}>Select all that work for you.</p>
            </div>
            <div className={styles.pillGroup}>
              {BEDROOM_OPTIONS.map((option) => (
                <span key={option.label} className={`${styles.pill} ${option.active ? styles.pillActive : ''}`}>
                  {option.label}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.formField}>
            <div>
              <h3 className={styles.fieldTitle}>What's your budget?</h3>
              <p className={styles.fieldDescription}>Tell us the minimum and maximum monthly rent you'd consider.</p>
            </div>
            <div className={styles.selectGroup}>
              <select className={styles.select} defaultValue={SELECTED_MIN} aria-label="Minimum monthly rent">
                {BUDGET_MIN_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <select className={styles.select} defaultValue={SELECTED_MAX} aria-label="Maximum monthly rent">
                {BUDGET_MAX_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formField}>
            <div>
              <h3 className={styles.fieldTitle}>Which property types work best?</h3>
              <p className={styles.fieldDescription}>Tick every style that feels right.</p>
            </div>
            <div className={styles.checkboxGrid}>
              {PROPERTY_TYPES.map((type) => (
                <label key={type.label} className={`${styles.checkbox} ${type.active ? styles.checkboxActive : ''}`}>
                  <input type="checkbox" defaultChecked={type.active} />
                  <span>{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formField}>
            <div>
              <h3 className={styles.fieldTitle}>How long are you looking to rent for?</h3>
              <p className={styles.fieldDescription}>Let us know the tenancy length you have in mind.</p>
            </div>
            <div className={styles.pillGroup}>
              {TENANCY_LENGTHS.map((length) => (
                <span key={length.label} className={`${styles.pill} ${length.active ? styles.pillActive : ''}`}>
                  {length.label}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.formField}>
            <div>
              <h3 className={styles.fieldTitle}>When would you like to move in?</h3>
              <p className={styles.fieldDescription}>We will prioritise properties that match your timeline.</p>
            </div>
            <div className={styles.pillGroup}>
              {MOVE_IN_TIMES.map((time) => (
                <span key={time.label} className={`${styles.pill} ${time.active ? styles.pillActive : ''}`}>
                  {time.label}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.formField}>
            <div>
              <h3 className={styles.fieldTitle}>Furnishing preference</h3>
              <p className={styles.fieldDescription}>Let us know how you'd like the property to be presented.</p>
            </div>
            <div className={styles.pillGroup}>
              {FURNISHING_OPTIONS.map((option) => (
                <span key={option.label} className={`${styles.pill} ${option.active ? styles.pillActive : ''}`}>
                  {option.label}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.formField}>
            <div>
              <h3 className={styles.fieldTitle}>Must-have features</h3>
              <p className={styles.fieldDescription}>Select the things you cannot live without.</p>
            </div>
            <div className={styles.checkboxGrid}>
              {FEATURE_TAGS.map((feature) => (
                <label key={feature.label} className={`${styles.checkbox} ${feature.active ? styles.checkboxActive : ''}`}>
                  <input type="checkbox" defaultChecked={feature.active} />
                  <span>{feature.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formField}>
            <div>
              <h3 className={styles.fieldTitle}>Do you have pets?</h3>
              <p className={styles.fieldDescription}>We will only share homes that welcome every member of the family.</p>
            </div>
            <div className={styles.pillGroup}>
              {PET_PREFERENCES.map((option) => (
                <span key={option.label} className={`${styles.pill} ${option.active ? styles.pillActive : ''}`}>
                  {option.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.mapSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h3>Which area(s) are you looking in?</h3>
            <p>
              Drop pins on the map or type in the neighbourhoods you love. We will match you with new listings the moment
              they launch.
            </p>
          </div>
          <div className={styles.sectionHeaderActions}>
            <Link href="/area-guides" className={styles.secondaryButton}>
              Add another area
            </Link>
          </div>
        </div>

        <div className={styles.mapShell}>
          <div className={styles.mapToolbar}>
            <button type="button" className={`${styles.mapMode} ${styles.mapModeActive}`}>
              Map
            </button>
            <button type="button" className={styles.mapMode}>
              Satellite
            </button>
          </div>
          <div className={styles.mapCanvas}>
            <div className={styles.mapRadius} />
            <div className={styles.mapRoad} />
            <div className={styles.mapRoad} />
            <div className={styles.mapRoad} />
            <div className={styles.mapRiver} />
            <div className={styles.mapMarker}>
              <span className={styles.mapLabel}>Shoreditch</span>
            </div>
            <div className={styles.mapMarker}>
              <span className={styles.mapLabel}>Islington</span>
            </div>
            <div className={styles.mapMarker}>
              <span className={styles.mapLabel}>Hackney</span>
            </div>
          </div>
          <div className={styles.mapLegend}>
            <strong>Search radius</strong>
            <span>1.5 miles</span>
            <p>We will alert you instantly when properties launch within this area.</p>
          </div>
        </div>

        <div className={styles.mapChips}>
          {AREA_TAGS.map((area) => (
            <span key={area.label} className={`${styles.chip} ${area.active ? styles.chipActive : ''}`}>
              {area.label}
              <span className={styles.chipRemove}>×</span>
            </span>
          ))}
        </div>
      </section>

      <section className={styles.flexibilitySection}>
        {FLEXIBILITY_CARDS.map((card) => (
          <article key={card.title} className={styles.questionCard}>
            <h4>{card.title}</h4>
            <p>{card.description}</p>
            <div className={styles.answerGroup}>
              {card.options.map((option) => (
                <span key={option.label} className={`${styles.answer} ${option.active ? styles.answerActive : ''}`}>
                  {option.label}
                </span>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className={styles.infoSection}>
        <h3>Any other information?</h3>
        <p>
          Tell us anything else that is important - from ideal streets to commuting considerations or lifestyle must-haves.
          The more detail you share, the smarter our recommendations become.
        </p>
        <textarea
          className={styles.textArea}
          placeholder="Let us know about school catchments, parking requirements or anything else that will help us tailor your search."
        />
      </section>
    </AccountLayout>
  );
}
