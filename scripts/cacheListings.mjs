import fs from 'fs';
import path from 'path';
import { fetchProperties } from '../lib/apex27.js';

async function cacheListings() {
  const properties = await fetchProperties();
  const filePath = path.join(process.cwd(), 'data', 'listings.json');
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, JSON.stringify(properties, null, 2));
  console.log(`Cached ${properties.length} properties to ${filePath}`);
}

cacheListings();
