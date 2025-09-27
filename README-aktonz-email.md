# Microsoft Graph Email Setup for aktonz.com

## Azure AD configuration
- App Registration → **API permissions (Delegated)**: add `Mail.Send`, `offline_access`, and `User.Read`, then click **Grant admin consent** for the tenant.
- App Registration → **Authentication**: confirm `https://aktonz.com/api/microsoft/callback` exists and add the dev URI `http://localhost:3000/api/admin/email/microsoft/callback`.
- App Registration → **Certificates & secrets**: create a new client secret named `aktonz-prod`, copy the **Value**, update the Vercel env var, and delete any old secrets.
- App Registration → **Supported account types**: keep the app single-tenant.
- Authentication → **Implicit/hybrid flows**: ensure all toggles remain **Off**.

## Required Vercel environment variables
Set the following in the Production and Preview environments:
- `MS_CLIENT_SECRET` – latest value from the Azure app registration.
- `TOKEN_ENCRYPTION_KEY` – 32-byte random value encoded with `openssl rand -base64 32`.
- `REDIS_URL` – connection string from Redis Cloud (must start with `rediss://`).

### Redis connectivity sanity check
After updating the `REDIS_URL`, confirm the connection with:

```bash
npm run ping-redis
```

The script automatically enables TLS when the URL begins with `rediss://` or the host ends with `redis-cloud.com`, upgrades `redis://` URLs to `rediss://` when needed, sends `PING`, and prints the Redis response.


## Redirect URIs
- Production: `https://aktonz.com/api/microsoft/callback`
- Local development: `http://localhost:3000/api/admin/email/microsoft/callback`

## Test plan (6 steps)
1. Navigate to `/admin` and click **Connect to Microsoft**; sign in with `info@aktonz.com` and grant consent.
2. In Redis Cloud, verify the `aktonz:ms:tokens` hash contains `access`, `refresh`, and `expiresAt` fields.

3. Submit `/api/contact` with sample data and confirm an email arrives in the `info@aktonz.com` mailbox.
4. Submit `/api/book-viewing`, `/api/offers`, and `/api/valuations` to ensure each sends mail to the correct recipient list.
5. Wait for the access token to age, then trigger another form submission to confirm automatic refresh works.
6. Revoke the client secret in Azure, set a new `MS_CLIENT_SECRET` in Vercel, and repeat step 1 to ensure rotation succeeds.
