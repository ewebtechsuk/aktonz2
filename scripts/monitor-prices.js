import fs from 'fs/promises';
import path from 'path';

const LISTINGS_PATH = path.join(process.cwd(), 'data', 'listings.json');
const HISTORY_PATH = path.join(process.cwd(), 'data', 'price-history.json');
const ALERTS_PATH = path.join(process.cwd(), 'data', 'price-alerts.json');

async function readJson(file, def) {
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data);
  } catch {
    return def;
  }
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

async function monitorPrices() {
  const listings = await readJson(LISTINGS_PATH, []);
  const history = await readJson(HISTORY_PATH, {});
  const alerts = await readJson(ALERTS_PATH, {});

  for (const listing of listings) {
    const id = String(listing.id);
    const price = parseFloat(listing.price);
    const oldPrice = history[id];

    if (typeof oldPrice !== 'undefined' && oldPrice !== price) {
      const emails = alerts[id] || [];
      for (const email of emails) {
        console.log(`Notify ${email} of price change on property ${id}: ${oldPrice} -> ${price}`);
        // Placeholder for email service integration
      }
    }

    history[id] = price;
  }

  await writeJson(HISTORY_PATH, history);
}

monitorPrices().catch((err) => {
  console.error('Failed to monitor prices', err);
});
