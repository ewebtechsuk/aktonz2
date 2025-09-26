# Property Portal

A minimal Next.js application for an estate and letting agent powered by the Apex27 CRM.

## Development

```
npm install
npm run dev
```

## Environment Variables

Create a `.env.local` file and set `APEX27_API_KEY` (and optionally `APEX27_BRANCH_ID` for your branch) to fetch real property data from the Apex27 API. Without these variables, no listings will be shown.

### Email configuration

The contact, offer, and viewing forms send transactional email through SMTP. Configure these environment variables wherever the Next.js server runs:

| Variable | Description |
| --- | --- |
| `SMTP_HOST` | SMTP hostname (e.g. `smtp.office365.com`). |
| `SMTP_PORT` | SMTP port. Use `587` for STARTTLS (recommended) or `465` for implicit TLS. |
| `SMTP_SECURE` | Set to `"false"` for STARTTLS (port 587) or `"true"` for implicit TLS (port 465). |
| `SMTP_USER` | Username for authentication. For Microsoft 365 this is the full mailbox address (e.g. `info@aktonz.com`). |
| `SMTP_PASS` | Password or app password for the mailbox. Required even when multi-factor authentication is enabled. |
| `EMAIL_FROM` | Default "From" address for all outgoing messages. Can be the same as `SMTP_USER` or an alias on that mailbox. |
| `AKTONZ_EMAIL` | Comma-separated list of internal recipients who should receive notifications. Defaults to `info@aktonz.com` if omitted. |

When using Microsoft 365 (as shown in the Microsoft Admin Center screenshot), make sure the mailbox you authenticate with has **SMTP AUTH** enabled and, if MFA is required, create an **app password**. Microsoft documents the SMTP endpoint under **Settings → Domains → (select your domain) → DNS records**; the typical configuration is:

```
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=info@aktonz.com
SMTP_PASS=<your app password>
EMAIL_FROM=info@aktonz.com
AKTONZ_EMAIL=info@aktonz.com
```

Restart the development or production server after adding or changing these variables so the new configuration is picked up.

To allow the registration form to create contacts when the app is statically
deployed, also set the public equivalents
`NEXT_PUBLIC_APEX27_API_KEY` and `NEXT_PUBLIC_APEX27_BRANCH_ID`. These values
are embedded at build time and used by the client-side fallback when no backend
is available.

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
