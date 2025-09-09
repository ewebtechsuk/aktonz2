# Property Portal

A minimal Next.js application for an estate and letting agent powered by the Apex27 CRM.

## Development

```
npm install
npm run dev
```

## Environment Variables

Copy `.env.local.example` to `.env.local` and set `APEX27_API_KEY` (and optionally `APEX27_BRANCH_ID` for your branch) to fetch real property data from the Apex27 API. Without these variables, the app displays sample listings.

## Build

```
npm run build
npm start
```
