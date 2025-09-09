# Property Portal

A minimal Next.js application for an estate and letting agent powered by the Apex27 CRM.

## Development

```
npm install
npm run dev
```

## Environment Variables

Copy `.env.local.example` to `.env.local` and set `APEX27_API_KEY` (and optionally `APEX27_BRANCH_ID` for your branch) to fetch real property data from the Apex27 API. If the key is missing or requests fail, the app falls back to cached or sample listings.

## Build

```
npm run build
npx serve out
```

## Cache Listings for Static Deploys

For commit-driven deployments (e.g. GitHub Pages) where the build
environment cannot access the Apex27 API, you can prefetch listings and
commit them to the repository:

1. Ensure `APEX27_API_KEY` (and optional `APEX27_BRANCH_ID`) are set in
   `.env.local`.
2. Run `npm run cache` to save the current live listings into
   `data/listings.json`.
3. Commit `data/listings.json` and rebuild the site:
   ```
   npm run build
   ```
   The static output in `out/` will now contain the cached listings.
