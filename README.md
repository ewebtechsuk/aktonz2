# Property Portal

A minimal Next.js application for an estate and letting agent powered by the Apex27 CRM.

## Development

```
npm install
npm run dev
```

## Environment Variables

Create a `.env.local` file and set `APEX27_API_KEY` (and optionally `APEX27_BRANCH_ID` for your branch) to fetch real property data from the Apex27 API. Without these variables, no listings will be shown.

If the site is deployed to a static host where Next.js API routes are not
available, set `NEXT_PUBLIC_BOOK_VIEWING_API` to the base listings URL for
viewing requests (e.g. `https://api.apex27.co.uk/listings`). The property ID and
`/viewings` path will be appended automatically.


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

## API Testing

Use [Dredd](https://dredd.org/) to verify the API blueprint against the Apex27 service.

```

export APEX27_API_KEY=b3ccaef8aeecf3c82f2b9da07127cfd1

NODE_OPTIONS=--dns-result-order=ipv4first dredd --config .dredd.yml --dry-run
```

The `--dry-run` flag checks the blueprint syntax without making network requests.
Remove it to test against the live API.
