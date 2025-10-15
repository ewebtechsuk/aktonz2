# Scraye → Apex27 property sync

## Landlord association
- Scraye imports should link each property to the dedicated landlord contact recorded as `Scraye Scraye` (`id: apx-contact-scraye`) so that stock aggregated from the Scraye feed is tied back to a single landlord record for reporting and workflows.【F:data/apex27-contacts.json†L219-L237】 The sync enforces this by always sending the `landlordContactId` field with that identifier (override with `APEX27_SCRAYE_LANDLORD_ID` if the CRM uses a different contact).【F:lib/apex27-sync.mjs†L3-L7】【F:lib/apex27-sync.mjs†L40-L47】

## Property payload requirements
The `mapListingToPayload` helper in `lib/apex27-sync.mjs` shows every field we send when creating or updating an Apex27 listing. Each Scraye record must supply values for the following properties (defaults are applied where the feed omits data):

- `externalReference` — derived from the Scraye source identifier; listings without this value are skipped entirely.【F:lib/apex27-sync.mjs†L38-L41】【F:lib/apex27-sync.mjs†L95-L102】
- `title` and `description` — populated from the listing title, display address, or a fallback string so Apex27 receives a human-readable summary.【F:lib/apex27-sync.mjs†L42-L45】
- `transactionType` and `status` — set to `rent`/`sale` and `AVAILABLE` (unless Scraye supplies different values) to keep Apex27 workflow states accurate.【F:lib/apex27-sync.mjs†L46-L49】
- `branchId` — forwarded when `APEX27_BRANCH_ID` is configured to scope listings to the correct branch.【F:lib/apex27-sync.mjs†L45】
- `landlordContactId` — defaults to the Scraye landlord contact so that every imported property is attached to the same landlord record unless the feed explicitly specifies another contact ID.【F:lib/apex27-sync.mjs†L6-L7】【F:lib/apex27-sync.mjs†L45-L47】
- `price`, `priceCurrency`, and optional `rentFrequency` — numeric rent or sale price values with currency metadata.【F:lib/apex27-sync.mjs†L52-L55】
- Key property facts: bedrooms, bathrooms, receptions, latitude/longitude, property type, furnished state, availability date, size, deposit type, and feature list.【F:lib/apex27-sync.mjs†L32-L37】【F:lib/apex27-sync.mjs†L56-L63】
- Marketing collateral: primary address line, postcode/outcode, external URL, and image gallery URLs so Apex27 can present the property online and in brochures.【F:lib/apex27-sync.mjs†L64-L73】

These defaults mean Scraye feeds that at least include an ID, location, price, and core metadata will result in a valid payload; anything missing is either coerced to `null` or replaced with a sensible fallback before the record is sent to Apex27.【F:lib/apex27-sync.mjs†L32-L73】
