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

### Microsoft 365 admin connection

The admin dashboard can guide you through connecting a shared mailbox using
Microsoft OAuth. No access to your Microsoft 365 tenant is required—just
register an **Azure App Registration** under your own account and supply the
resulting identifiers through environment variables:

#### Step-by-step: retrieve `MS_CLIENT_ID`

1. Sign in to [https://portal.azure.com](https://portal.azure.com) and choose
   the correct tenant from the header if you manage more than one.
2. From the portal home (the screen shown in the screenshot) open
   **Azure Active Directory**. On the **All services** page it appears in the
   **Identity** section—click it there, or if you do not see the tile immediately
   use the global search bar at the top and type *Azure Active Directory*.
3. In Azure AD, select **App registrations** → **New registration**.
4. Fill in the registration form:
   * **Name:** e.g. `Aktonz Admin Mailbox Connector`.
   * **Supported account types:** keep **Accounts in this organizational
     directory only** unless you explicitly need multi-tenant access.
   * **Redirect URI:** choose **Web** and enter
     `https://<your-domain>/api/microsoft/callback` for production (replace
     `<your-domain>` with the host serving your admin dashboard). Keep the
     local-testing URI (`http://localhost:3000/api/microsoft/callback`) handy—you
     will add it alongside the production URL in a moment.
   * On the **Register an application** screen (the one shown in the screenshot),
     double-check the values, then press **Register** in the bottom-left corner to
     create the app registration.
5. On the registration overview page copy the value labelled **Application
   (client) ID**—this is what the app expects as `MS_CLIENT_ID` (or one of the
   accepted aliases such as `MICROSOFT_CLIENT_ID`).
6. Still within the app registration, open **Authentication** in the left-hand
   menu (the screen shown in your latest screenshot). If the web redirect URI
   you entered earlier is not listed, click **Add a platform** → **Web**, paste
   `https://<your-domain>/api/microsoft/callback`, and press **Configure**.
   With the production URL saved, click **Add URI** on the same card and include
   the local development callback `http://localhost:3000/api/microsoft/callback`
   so Azure recognises both environments. Confirm the platform now appears
   under **Redirect URIs**, then choose **Save** at the bottom of the page so
   Azure accepts the change.
7. Add the value to `.env.local` for local development or to your hosting
   platform’s environment variable manager for production. Restart the server
   or redeploy so the new configuration is loaded.

#### Populate the Aktonz connector credentials

For the existing Aktonz email connector registration you will need to capture
these identifiers from Azure:

* **Application (client) ID:** `28c9d37b-2c2b-4d49-9ac4-4c180967bc7c`.

* **Client secret value:** create (or rotate) a secret under **Certificates &
  secrets**, then copy the **Value** column immediately—Azure will not display
  it again.
* **Directory (tenant) ID:** available on the same **Overview** page.

Add them to your environment configuration. The Aktonz connector currently uses
these values (update the secret and tenant ID if you rotate them in Azure):

```
MS_CLIENT_ID=28c9d37b-2c2b-4d49-9ac4-4c180967bc7c

MS_CLIENT_SECRET=<client secret value>
MS_TENANT_ID=<directory tenant id>
MS_REDIRECT_URI=https://aktonz.com/api/microsoft/callback
MS_SCOPES="offline_access Mail.Send User.Read"
TOKEN_ENCRYPTION_KEY=<generate a long random string>
```

#### Error: `AADSTS700016` when signing in

If Microsoft returns **AADSTS700016** with the message *"Application with
identifier '04651e3a-82c5-4e03-ba50-574b2bb79cac' was not found in the
directory 'Aktonz'"*, the sign-in attempt is still using the deprecated default
app registration ID. Resolve it with the checklist below:

1. **Update the client ID.** Set `MS_CLIENT_ID` (or any of the accepted
   aliases) to `28c9d37b-2c2b-4d49-9ac4-4c180967bc7c`. Redeploy or restart the
   server after changing the environment variable.
2. **Double-check tenant routing.** For the single-tenant connector keep
   `MS_TENANT_ID` set to `60737a1b-9707-4d7f-9909-0ee943a1ffff`. If you prefer
   multi-tenant sign-in, remove the variable entirely so the code falls back to
   `common`.
3. **Confirm the redirect URIs.** Ensure the production
   `https://aktonz.com/api/microsoft/callback` and local development
   `http://localhost:3000/api/admin/email/microsoft/callback` URLs are still
   registered under **Authentication → Web** in the Azure portal.
4. **Retry the connection.** Clear any cached auth tabs, then click **Connect
   Microsoft** again. The login prompt should now reference the updated client
   ID.

Running `npm run check-ms-connector` after updating the environment variables
verifies that the connector will no longer fall back to the old identifier.

> **Current production secret (September 2025):** `aktonz-email-connector-2`
> (secret ID `5ac90759-6286-48c0-98b2-5a2aa19d7e6d`). Copy the secret **Value**
> directly from Azure and update the `MS_CLIENT_SECRET` environment variable in
> each required Vercel environment.

> ⚠️ Rotate the client secret if it has ever been shared outside Azure. Delete
> superseded secrets so they can no longer be used.

If your hosting provider supports secret scopes (e.g. **Production** vs
**Preview**), define the same keys in each environment that needs the Microsoft
integration. After saving, redeploy so the server can read the refreshed
settings.

| Variable | Description |
| --- | --- |
| `MS_CLIENT_ID` | The **Application (client) ID** from Azure App Registration. Equivalent fallbacks supported: `MICROSOFT_CLIENT_ID`, `NEXT_PUBLIC_MICROSOFT_CLIENT_ID`, `AZURE_AD_CLIENT_ID`, `MSAL_CLIENT_ID`. |
| `MS_REDIRECT_URI` | The production redirect URI you configure on the app registration. Use `https://<your-domain>/api/microsoft/callback` and register the local testing URI `http://localhost:3000/api/microsoft/callback` under the same platform. If unset, the code falls back to `https://aktonz.com/api/microsoft/callback` (see `lib/ms-redirect.js`). Public fallbacks are supported: `MICROSOFT_REDIRECT_URI`, `NEXT_PUBLIC_MICROSOFT_REDIRECT_URI`, `NEXT_PUBLIC_MICROSOFT_REDIRECT_URL`, `AZURE_AD_REDIRECT_URI`, `AZURE_AD_REDIRECT_URL`. |
| `MS_TENANT_ID` | (Optional) Your tenant ID. When using the bundled Aktonz app registration (`MS_CLIENT_ID` defaults to `28c9d37b-2c2b-4d49-9ac4-4c180967bc7c`), the connector automatically falls back to the Aktonz tenant (`60737a1b-9707-4d7f-9909-0ee943a1ffff`) so a missing configuration still signs in correctly. For custom app registrations, leave unset to default to `common` for multi-tenant apps. Synonymous environment keys such as `MICROSOFT_TENANT_ID`, `AZURE_DIRECTORY_ID`, `AZURE_TENANT_ID`, or `AZURE_AD_TENANT_ID` are also detected. Values like `"undefined"` or `"null"` are ignored so a blank dashboard setting does not break sign-in. |
| `MS_SCOPES` | (Optional) Custom OAuth scopes. Defaults to `offline_access https://graph.microsoft.com/.default`. |

Once the environment variables are present, restart the server and press
**Connect Microsoft** on the admin page. The browser is redirected to Microsoft
to finish authorization—no sensitive tenant information needs to be shared with
the application maintainers.

#### Verify your configuration from the command line

If you are unsure whether the admin **Connect Microsoft** button has everything
it needs, run the lightweight checker:

```
npm run check-ms-connector
```

The script inspects the supported environment variable aliases and calls out
any mandatory settings (such as `MS_CLIENT_ID`/`MICROSOFT_CLIENT_ID`) that are
still missing.


### Troubleshooting pull request creation

If you have local changes ready but the pull request creation step fails—for
example the tooling reports **"failed to create pr"**—run the automated
diagnostics and then work through the manual checklist below.

#### Quick diagnostics when you see "failed to create pr"

```
npm run check-pr
```

The script highlights anything that would block pull-request creation:

* uncommitted changes in your working tree,
* a missing or misconfigured `origin` remote,
* branches without an upstream tracking branch, and
* unpushed commits waiting locally.

If other remotes exist but `origin`/the upstream branch is missing, the command
exits with a non-zero status so you can fix those items before trying again. In
an entirely fresh clone (no remotes yet) it prints informational guidance about
adding `origin` without failing the run.

It also surfaces actionable commands—such as `git push --set-upstream`—so you
can fix the detected issues before retrying PR creation from the terminal or the
GitHub web UI.

#### Manual checklist

After resolving any items highlighted by `npm run check-pr`, confirm the
following:

1. **Confirm your branch is pushed.**
   ```bash
   git status -sb
   git remote -v
   ```
   Make sure the branch you are on is tracked by your fork or the upstream
   repository. Push it with `git push origin <branch-name>` and resolve any
   authentication prompts.
2. **Sync the default branch.**
   Pull the latest `main`/`master` updates (`git fetch origin` followed by
   `git merge origin/main`) so the pull request is based on the newest commits
   and does not contain unrelated changes.
3. **Re-run required checks locally.**
   If the remote rejects the PR because checks failed, rerun them before
   retrying. Typical examples for this project are:
   ```bash
   npm run lint
   npm test
   ```
   Fix any reported issues, commit, and push again.
4. **Verify repository permissions.**
   You need write access (or a fork) to open a pull request. If access was
   revoked or expired, request it from the maintainer, then push from your fork
   and open the PR there instead.
5. **Retry from the GitHub UI.**
   Once the branch exists on GitHub, navigate to the repository in your browser
   and click **Compare & pull request**. Provide a clear title and description,
   then submit. If the UI still reports an error, capture the exact message and
   share it with the maintainers for further help.

#### Checklist: information to capture while you are in Azure

Gather these items while you are in the Azure portal so you can populate the
environment variables (or share them with the wider team, if needed):

| Question | Where to find it / what to record |
| --- | --- |
| **Application (client) ID** | Azure portal → **Azure Active Directory** → **App registrations** → *Your registration* → **Overview**. Copy the **Application (client) ID** value and store it as `MS_CLIENT_ID` (or one of the accepted aliases such as `MICROSOFT_CLIENT_ID`). |
| **Directory (tenant) ID** | The same Overview screen lists **Directory (tenant) ID**. Copy it if you intend to keep the app single-tenant and configure it as `MS_TENANT_ID` (or `MICROSOFT_TENANT_ID` if you prefer the older naming). When using the bundled Aktonz application you can omit the setting—the code falls back to `60737a1b-9707-4d7f-9909-0ee943a1ffff`. For custom registrations that should allow any tenant, leave it unset to default to `common` for multi-tenant sign-in. |
| **Client secret value** | Azure portal → *Your registration* → **Certificates & secrets** → **Client secrets**. Select **New client secret**, give it a description/expiry, click **Add**, then immediately copy the **Value** column (this is the only time Azure reveals it). Store the value securely—this repo does **not** commit secrets. |
| **Redirect URI** | Use `https://<your-domain>/api/microsoft/callback` for production and `http://localhost:3000/api/microsoft/callback` when testing locally. Register both under **Authentication → Web** so Azure AD recognises each environment. |
| **Single-tenant or multi-tenant?** | Step 4 of the registration form controls this. Keeping **Accounts in this organizational directory only** selected produces a single-tenant app scoped to `aktonz.com`. Switch to multi-tenant only if you plan to allow other Azure AD tenants. |

> 💡 Tip: keep a secure record (e.g. password manager entry) with the client ID,
> tenant ID, redirect URI, and client secret value so you can redeploy without
> revisiting Azure each time.

### Application architecture quick reference

These answers cover the follow-up questions about the Next.js project itself:

| Topic | Answer |
| --- | --- |
| **Next.js version** | The project runs on Next.js `15.5.2` per `package.json`. It uses the **Pages Router** (see the `pages/` directory) rather than the App Router. |
| **Persistence layer** | There is **no database** connection. Property data is fetched from the Apex27 API and cached into JSON under `data/`. Microsoft OAuth tokens are encrypted and written to `.aktonz-ms-tokens.json` by `lib/token-store.js`, letting API routes refresh them without external storage. |
| **Who can send mail?** | Only `info@aktonz.com` may authorise the connector. Outbound messages are delivered through Microsoft Graph with the access token granted to that mailbox, so every email is sent directly from `info@aktonz.com`. |
| **Which forms send email?** | The Contact (`pages/api/contact.js`), Book a Viewing (`pages/api/book-viewing.js`), Offers (`pages/api/offers.js`), and Valuation (`pages/api/valuations.js`) endpoints all call `sendMailGraph` from `lib/ms-graph.js` to dispatch Microsoft 365 email. |
| **From address behaviour** | Microsoft Graph sends each message as `info@aktonz.com`. The HTML bodies include the visitor's contact details; altering the `From` header would require delegated send permissions for another mailbox. |

### Token handling and storage guidance

The Microsoft OAuth flow is implemented in `pages/api/microsoft/connect.js`,
`pages/api/microsoft/callback.js`, and the legacy/local-compatible route
`pages/api/admin/email/microsoft/callback.js` (kept for older admin dashboards).
`lib/ms-oauth.js` performs the token exchange, verifies that the signed-in user is
`info@aktonz.com`, and saves the encrypted bundle through `lib/token-store.js`.

* **Encryption helper** – `lib/ms-graph.js` provides `encryptToken` and
  `decryptToken`, using AES-256-GCM with the key from `TOKEN_ENCRYPTION_KEY`.
  Generate a long, random value (for example `openssl rand -base64 48`) and set
  it in `.env.local` or your hosting dashboard before connecting.
* **Storage location** – tokens are written to `.aktonz-ms-tokens.json` in the
  project root. Ensure the deployment target allows read/write access to this
  path and treat the file as sensitive information.
* **Rotation and revocation** – to revoke access, delete
  `.aktonz-ms-tokens.json`, rotate the Azure client secret or invalidate the
  refresh token, update the environment variables, and reconnect via the admin
  dashboard.

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
