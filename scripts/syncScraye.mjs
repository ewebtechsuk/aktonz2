import fs from 'node:fs/promises';
import path from 'path';
import {
  fetchScrayeListings,
  normalizeScrayeListings,
  loadScrayeCache,
} from '../lib/scraye.mjs';

async function saveCache(data) {
  const filePath = path.join(process.cwd(), 'data', 'scraye.json');
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

async function syncToApex(listings) {
  if (!process.env.APEX27_API_KEY) {
    console.log('APEX27_API_KEY not set, skipping CRM sync.');
    return { created: 0, updated: 0, skipped: listings.length };
  }
  try {
    const { syncScrayeListingsToApex } = await import('../lib/apex27-sync.mjs');
    return await syncScrayeListingsToApex(listings);
  } catch (error) {
    console.error('Failed to sync listings to Apex27', error);
    return { created: 0, updated: 0, skipped: listings.length, error: true };
  }
}

async function main() {
  const placeIdEnv = process.env.SCRAYE_PLACE_IDS || '';
  const placeIds = placeIdEnv
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (placeIds.length) {
    console.log(`Restricting Scraye sync to place IDs: ${placeIds.join(', ')}`);
  } else {
    console.log('Loading Scraye listings for all available areas...');
  }

  const [rentListings, saleListings] = await Promise.all([
    fetchScrayeListings({ transactionType: 'rent', placeIds: placeIds.length ? placeIds : undefined }),
    fetchScrayeListings({ transactionType: 'sale', placeIds: placeIds.length ? placeIds : undefined }),
  ]);

  const rent = normalizeScrayeListings(rentListings);
  const sale = normalizeScrayeListings(saleListings);

  const cache = {
    generatedAt: new Date().toISOString(),
    rent,
    sale,
  };

  const filePath = await saveCache(cache);
  console.log(
    `Saved ${rent.length} rent and ${sale.length} sale listings to ${filePath}`
  );

  const syncResult = await syncToApex([...rent, ...sale]);
  if (syncResult && !syncResult.error) {
    console.log(
      `Apex27 sync complete (created: ${syncResult.created}, updated: ${syncResult.updated}, skipped: ${syncResult.skipped})`
    );
  }
}

main().catch((error) => {
  console.error('Failed to sync Scraye listings', error);
  process.exitCode = 1;
});
