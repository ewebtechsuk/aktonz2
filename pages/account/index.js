import Link from 'next/link';

import AccountLayout from '../../components/account/AccountLayout';
import styles from '../../styles/Account.module.css';

const PRICE_MIN_OPTIONS = ['£1,500 pcm', '£1,700 pcm', '£1,900 pcm', '£2,100 pcm'];
const PRICE_MAX_OPTIONS = ['£2,600 pcm', '£2,900 pcm', '£3,200 pcm', '£3,500 pcm'];
const TENURE_OPTIONS = ['6 months', '12 months', '18 months', '24 months+'];

const BEDROOM_OPTIONS = [
  { label: 'Studio' },
  { label: '1 bed' },
  { label: '2 bed', active: true },
  { label: '3 bed' },
  { label: '4+ bed' },
];

const PROPERTY_TYPES = [
  { label: 'Apartment', active: true },
  { label: 'House' },
  { label: 'New build' },
  { label: 'Period' },
  { label: 'Loft' },
];

const AREA_TAGS = [
  { label: 'Shoreditch', active: true },
  { label: 'Islington', active: true },
  { label: 'Hackney', active: true },
  { label: 'Dalston' },
  { label: 'Canonbury' },
];

const FLEXIBILITY_CHOICES = [
  { label: 'Stick to my areas' },
  { label: 'Show nearby too', active: true },
  { label: 'Cast a wider net' },
];

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
      <div className={styles.pageSections}>
        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <h2>Register with us to jump the queue</h2>
              <p>
                Share your preferences so your dedicated lettings team can send tailored homes the moment they launch.
              </p>
            </div>
            <Link href="/account/profile" className={styles.primaryCta}>
              Update my preferences
            </Link>
          </header>

          <div className={styles.registerGrid}>
            <div className={styles.formGroup}>
              <span className={styles.groupLabel}>Please share the price range you'd like</span>
              <div className={styles.rangeControls}>
                <label className={styles.selectWrap}>
                  <span className={styles.selectCaption}>Min</span>
                  <select className={styles.select} defaultValue="£1,900 pcm" aria-label="Minimum price per month">
                    {PRICE_MIN_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.selectWrap}>
                  <span className={styles.selectCaption}>Max</span>
                  <select className={styles.select} defaultValue="£3,200 pcm" aria-label="Maximum price per month">
                    {PRICE_MAX_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className={styles.formGroup}>
              <span className={styles.groupLabel}>And for how long?</span>
              <select className={`${styles.select} ${styles.selectFull}`} defaultValue="12 months" aria-label="Tenancy length">
                {TENURE_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <span className={styles.groupLabel}>Please select number of bedrooms</span>
              <p className={styles.groupHint}>Choose every option that works for you.</p>
              <div className={styles.pillRow}>
                {BEDROOM_OPTIONS.map((option) => (
                  <span key={option.label} className={`${styles.pillOption} ${option.active ? styles.pillOptionActive : ''}`}>
                    {option.label}
                  </span>
                ))}
              </div>
            </div>

            <div className={styles.formGroup}>
              <span className={styles.groupLabel}>What type of property would you consider?</span>
              <p className={styles.groupHint}>Tick every style that feels right.</p>
              <div className={styles.chipRow}>
                {PROPERTY_TYPES.map((type) => (
                  <span key={type.label} className={`${styles.chipOption} ${type.active ? styles.chipOptionActive : ''}`}>
                    {type.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.panel} ${styles.mapPanel}`}>
          <header className={styles.sectionHeader}>
            <div>
              <h3>Which area(s) are you looking in?</h3>
              <p>Drop pins on the map or search to add neighbourhoods you love.</p>
            </div>
            <Link href="/area-guides" className={styles.ghostButton}>
              Add another area
            </Link>
          </header>

          <div className={styles.mapShell}>
            <div className={styles.mapSurface}>
              <div className={styles.mapToolbar}>
                <button type="button" className={`${styles.mapMode} ${styles.mapModeActive}`} aria-pressed="true">
                  Map
                </button>
                <button type="button" className={styles.mapMode} aria-pressed="false">
                  Satellite
                </button>
              </div>
              <svg
                className={styles.mapIllustration}
                viewBox="0 0 640 360"
                role="presentation"
                focusable="false"
                aria-hidden="true"
              >
                <rect width="640" height="360" fill="#e8f5f0" />
                <path
                  d="M40 120c120-50 180 40 260 10s130-80 220-40 80 90 0 140-180-20-240-10-120 90-220 50"
                  fill="none"
                  stroke="#c3ddd3"
                  strokeWidth="18"
                  strokeLinecap="round"
                />
                <path
                  d="M20 200c90 40 150-10 210-30s120-10 200 40 160 40 190-30"
                  fill="none"
                  stroke="#99c8b8"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <path
                  d="M100 40c40 70 140 70 210 50s150-30 220 20"
                  fill="none"
                  stroke="#70b39a"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path
                  d="M280 140c40 40 80 40 140 20s120-20 180 60"
                  fill="none"
                  stroke="#54a48a"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <g fill="#00965f">
                  <circle cx="340" cy="150" r="12" />
                  <circle cx="430" cy="120" r="12" />
                  <circle cx="290" cy="210" r="12" />
                </g>
                <g fill="#ffffff" fontSize="14" fontWeight="700" textAnchor="middle" dominantBaseline="middle">
                  <text x="340" y="150">S</text>
                  <text x="430" y="120">I</text>
                  <text x="290" y="210">H</text>
                </g>
              </svg>
            </div>

            <div className={styles.mapFootnote}>
              <strong>Search radius</strong>
              <span>1.5 miles</span>
              <p>We will alert you instantly when properties launch within this area.</p>
            </div>
          </div>

          <div className={styles.mapSearch}>
            <label className={styles.searchInput}>
              <span className={styles.searchIcon}>
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                  <path
                    d="M9 3.5a5.5 5.5 0 0 1 4.13 9.1l3.68 3.68a1 1 0 1 1-1.42 1.42l-3.68-3.68A5.5 5.5 0 1 1 9 3.5Zm0 2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <input
                type="text"
                className={styles.searchField}
                placeholder="Search areas, stations or postcodes"
                aria-label="Search areas, stations or postcodes"
              />
            </label>
            <p className={styles.helperText}>Add at least three areas so we can cross-match new launches instantly.</p>
          </div>

          <div className={styles.areaChips}>
            {AREA_TAGS.map((area) => (
              <span key={area.label} className={`${styles.areaChip} ${area.active ? styles.areaChipActive : ''}`}>
                {area.label}
                <span className={styles.chipRemove} aria-hidden="true">
                  ×
                </span>
              </span>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <h3>How flexible are you?</h3>
          <p>Would you like us to be more flexible about your search width? Let us know how much we can broaden results.</p>
          <div className={styles.flexOptions}>
            {FLEXIBILITY_CHOICES.map((choice) => (
              <span key={choice.label} className={`${styles.flexOption} ${choice.active ? styles.flexOptionActive : ''}`}>
                {choice.label}
              </span>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <h3>Any other information?</h3>
          <p>
            We can work even faster when we know about commute times, outside space, school catchments or anything else that
            matters.
          </p>
          <textarea
            className={styles.textArea}
            placeholder="Tell us about must-have features, pet requirements or timing considerations."
            rows={6}
          />
        </section>
      </div>
    </AccountLayout>
  );
}
