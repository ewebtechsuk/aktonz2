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
     `https://<your-domain>/api/admin/email/microsoft/callback` (replace
     `<your-domain>` with the host serving your admin dashboard).
   * On the **Register an application** screen (the one shown in the screenshot),
     double-check the values, then press **Register** in the bottom-left corner to
     create the app registration.
5. On the registration overview page copy the value labelled **Application
   (client) ID**—this is what the app expects as `MS_CLIENT_ID` (or one of the
   accepted aliases such as `MICROSOFT_CLIENT_ID`).
6. Still within the app registration, open **Authentication** in the left-hand
   menu (the screen shown in your latest screenshot). If the web redirect URI
   you entered earlier is not listed, click **Add a platform** → **Web**, paste
   `https://<your-domain>/api/admin/email/microsoft/callback`, and press
   **Configure**. Confirm the platform now appears under **Redirect URIs**, then
   choose **Save** at the bottom of the page so Azure accepts the change.
7. Add the value to `.env.local` for local development or to your hosting
   platform’s environment variable manager for production. Restart the server
   or redeploy so the new configuration is loaded.

#### Populate the Aktonz connector credentials

For the existing Aktonz email connector registration you will need to capture
these identifiers from Azure:

* **Application (client) ID:** copy it from the registration **Overview** page.
* **Client secret value:** create (or rotate) a secret under **Certificates &
  secrets**, then copy the **Value** column immediately—Azure will not display
  it again.
* **Directory (tenant) ID:** available on the same **Overview** page.

Add them to your environment configuration—never commit the real values to Git
or documentation. Replace the placeholders below with your actual details:

```
MS_CLIENT_ID=<application client id>
MS_CLIENT_SECRET=<client secret value>
MS_TENANT_ID=<directory tenant id>
MS_REDIRECT_URI=https://aktonz.com/api/microsoft/callback
MS_SCOPES="offline_access Mail.Send User.Read"
TOKEN_ENCRYPTION_KEY=<generate a long random string>
```

> ⚠️ Rotate the client secret if it has ever been shared outside Azure. Delete
> superseded secrets so they can no longer be used.

If your hosting provider supports secret scopes (e.g. **Production** vs
**Preview**), define the same keys in each environment that needs the Microsoft
integration. After saving, redeploy so the server can read the refreshed
settings.

| Variable | Description |
| --- | --- |
| `MS_CLIENT_ID` | The **Application (client) ID** from Azure App Registration. Equivalent fallbacks supported: `MICROSOFT_CLIENT_ID`, `NEXT_PUBLIC_MICROSOFT_CLIENT_ID`, `AZURE_AD_CLIENT_ID`, `MSAL_CLIENT_ID`. |
| `MS_REDIRECT_URI` | The redirect URI you configure on the app registration. Use `https://<your-domain>/api/admin/email/microsoft/callback`. Public fallbacks are supported: `MICROSOFT_REDIRECT_URI`, `NEXT_PUBLIC_MICROSOFT_REDIRECT_URI`, `NEXT_PUBLIC_MICROSOFT_REDIRECT_URL`, `AZURE_AD_REDIRECT_URI`, `AZURE_AD_REDIRECT_URL`. |
| `MS_TENANT_ID` | (Optional) Your tenant ID. Leave unset to default to `common` for multi-tenant apps. Synonymous environment keys such as `MICROSOFT_TENANT_ID`, `AZURE_DIRECTORY_ID`, `AZURE_TENANT_ID`, or `AZURE_AD_TENANT_ID` are also detected. |
| `MS_SCOPES` | (Optional) Custom OAuth scopes. Defaults to `offline_access https://graph.microsoft.com/.default`. |

Once the environment variables are present, restart the server and press
**Connect Microsoft** on the admin page. The browser is redirected to Microsoft
to finish authorization—no sensitive tenant information needs to be shared with
the application maintainers.

### Troubleshooting pull request creation

If you have local changes ready but the pull request creation step fails—for
example the tooling reports **"failed to create pr"**—run the automated
diagnostics and then work through the manual checklist below.

#### Quick diagnostics when you see "failed to create pr"

```
npm run check-pr
```

The script validates that:

* your working tree is committed,
* a remote called `origin` is configured,
* the current branch tracks a remote branch, and
* the branch has been pushed so GitHub can see it.

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
| **Directory (tenant) ID** | The same Overview screen lists **Directory (tenant) ID**. Copy it if you intend to keep the app single-tenant and configure it as `MS_TENANT_ID` (or `MICROSOFT_TENANT_ID` if you prefer the older naming); otherwise you can leave the environment variable unset to default to `common` for multi-tenant sign-in. |
| **Client secret value** | Azure portal → *Your registration* → **Certificates & secrets** → **Client secrets**. Select **New client secret**, give it a description/expiry, click **Add**, then immediately copy the **Value** column (this is the only time Azure reveals it). Store the value securely—this repo does **not** commit secrets. |
| **Redirect URI** | Use `https://<your-domain>/api/admin/email/microsoft/callback`. This matches the server route implemented in `pages/api/admin/email/microsoft/connect.js` when it resolves the callback URL. Register this exact URI under **Authentication → Web** so the OAuth flow succeeds. |
| **Single-tenant or multi-tenant?** | Step 4 of the registration form controls this. Keeping **Accounts in this organizational directory only** selected produces a single-tenant app scoped to `aktonz.com`. Switch to multi-tenant only if you plan to allow other Azure AD tenants. |

> 💡 Tip: keep a secure record (e.g. password manager entry) with the client ID,
> tenant ID, redirect URI, and client secret value so you can redeploy without
> revisiting Azure each time.

### Application architecture quick reference

These answers cover the follow-up questions about the Next.js project itself:

| Topic | Answer |
| --- | --- |
| **Next.js version** | The project runs on Next.js `15.5.2` per `package.json`. It uses the **Pages Router** (see the `pages/` directory) rather than the App Router. |
| **Persistence layer** | There is **no database** connection. Property data is fetched from the Apex27 API and, for static deploys, cached into JSON under `data/`. All form submissions are sent via SMTP using `lib/mailer.mjs`; nothing is stored server-side. |
| **Who can send mail?** | Outbound messages are sent through the credentials provided in `SMTP_USER`/`SMTP_PASS`. By default `EMAIL_FROM` is set to `info@aktonz.com`, so every form submission appears to originate from that mailbox. Allowing additional senders would require supplying different credentials (e.g. per-user) and updating the environment variables accordingly. |
| **Which forms send email?** | The Contact form (`pages/api/contact.js` via `lib/api/contact-handler.mjs`), the Book a Viewing workflow (`pages/api/book-viewing.js`), the Offers form (`pages/api/offers.js`), and the Valuation request (`pages/api/valuations.js`) all invoke `sendMailOrThrow` from `lib/mailer.mjs`. Configure SMTP/Microsoft OAuth before enabling these pages in production. |
| **From address behaviour** | Each API handler builds the message with `from: process.env.EMAIL_FROM` (see `lib/api/contact-handler.mjs` and `pages/api/book-viewing.js`). Unless you override that variable, all outgoing mail will display as `info@aktonz.com`. Sending “on behalf of” the authenticated user would require code changes to accept dynamic `From` headers and to delegate send permissions in Microsoft 365. |

### Token handling and storage guidance

The Microsoft OAuth entry point (`pages/api/admin/email/microsoft/connect.js`) only
creates the authorization URL and does **not** yet persist tokens. Before moving
to production, decide how you will protect the credentials Microsoft returns:

* **Encryption helper** – the codebase currently lacks an AES or similar helper
  for encrypting secrets at rest. If you store refresh tokens in your own
  database, introduce a key-management strategy (for example, AES-256-GCM with a
  key stored in an environment variable supplied by your hosting provider).
* **Storage location** – plan where long-lived refresh tokens will live. The
  simplest option is an application database table keyed by admin user, but you
  can also offload storage to Azure Key Vault or another managed secrets
  manager. Ensure the storage is writeable from your Next.js API routes.
* **Rotation and revocation** – document how administrators can revoke the
  client secret and refresh tokens if a leak is suspected. Microsoft allows you
  to delete the client secret in the App Registration and issue a new one; be
  ready to update your environment variables and redeploy immediately.

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
