# Property Portal

A minimal Next.js application for an estate and letting agent powered by the Apex27 CRM.

## Development

```
npm install
npm run dev
```

## Environment Variables

Create a `.env.local` file and set `APEX27_API_KEY` (and optionally `APEX27_BRANCH_ID` for your branch) to fetch real property data from the Apex27 API. Without these variables, the app displays sample listings.

## Build

```
npm run build
npm start
```

## Cache Listings for Static Deploys

For commit-driven deployments (e.g. GitHub Pages) where the build
environment cannot access the Apex27 API, you can prefetch listings and
commit them to the repository:

1. Ensure `APEX27_API_KEY` (and optional `APEX27_BRANCH_ID`) are set in
   `.env.local`.
2. Run `npm run cache` to save the current live listings into
   `data/listings.json`.
3. To produce a static export, run:
   ```
   npm run build
   ```
   The static site will be generated in the `out/` directory (e.g. `npx serve out`).
