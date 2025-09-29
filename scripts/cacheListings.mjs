import fs from 'fs';
import path from 'path';

// Minimal .env.local loader (no extra deps)
function loadEnvLocal() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {}
}

// Load env before importing fetchProperties
loadEnvLocal();

const { fetchProperties } = await import('../lib/apex27.mjs');

function requireSecrets() {
  const missing = [];
  if (!process.env.APEX27_API_KEY || process.env.APEX27_API_KEY.trim() === '') {
    missing.push('APEX27_API_KEY');
  }

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    console.error(
      'Add them to your .env.local for local development or configure them as GitHub Actions secrets before deploying.'
    );
    process.exit(1);
  }
}

async function cacheListings() {
  requireSecrets();
  const properties = await fetchProperties();
  const filePath = path.join(process.cwd(), 'data', 'listings.json');
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, JSON.stringify(properties, null, 2));
  console.log(`Cached ${properties.length} properties to ${filePath}`);
}

cacheListings();