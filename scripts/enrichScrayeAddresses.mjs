import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { execFile } from 'child_process';

const execFileAsync = promisify(execFile);

const SCRAYE_API_URL = 'https://api.scraye.com/api';
const LISTING_QUERY = `query Listing($listingId: ObjectID!) {
  listing(id: $listingId) {
    id
    displayAddress
    addressComponents {
      outcode
      postcode
      street
      __typename
    }
    locality { id slug name __typename }
    borough { id slug name __typename }
    macrohood { id slug name __typename }
    neighbourhood { id slug name __typename }
  }
}`;

function sanitizeValue(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function buildFullAddress({ street, neighbourhood, borough, locality, postcode, outcode }) {
  const seen = new Set();
  const parts = [];
  const addPart = (value) => {
    const clean = sanitizeValue(value);
    if (!clean) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    parts.push(clean);
  };
  addPart(street);
  addPart(neighbourhood);
  addPart(borough);
  addPart(locality);
  const postcodePart = sanitizeValue(postcode) || sanitizeValue(outcode);
  if (postcodePart) {
    if (parts.length) {
      return `${parts.join(', ')} ${postcodePart}`;
    }
    return postcodePart;
  }
  return parts.join(', ');
}

async function fetchListingDetails(id) {
  const payload = JSON.stringify([
    {
      operationName: 'Listing',
      variables: { listingId: id },
      query: LISTING_QUERY,
    },
  ]);

  const { stdout } = await execFileAsync(
    'curl',
    [
      '-s',
      SCRAYE_API_URL,
      '-H',
      'content-type: application/json',
      '-H',
      'accept: application/json',
      '-H',
      'apollo-require-preflight: true',
      '-H',
      'referer: https://www.scraye.com/',
      '--data',
      payload,
    ],
    { maxBuffer: 10 * 1024 * 1024 }
  );

  const json = JSON.parse(stdout);
  const firstEntry = Array.isArray(json) ? json[0] : null;
  if (!firstEntry) {
    throw new Error(`Unexpected Scraye response for ${id}`);
  }
  if (firstEntry.errors && firstEntry.errors.length) {
    const message = firstEntry.errors.map((err) => err.message).join('; ');
    throw new Error(`Scraye API error for ${id}: ${message}`);
  }
  const listing = firstEntry.data?.listing;
  if (!listing) {
    throw new Error(`Listing ${id} not found`);
  }
  return listing;
}

function mergeAddressData(entry, detail) {
  const components = detail.addressComponents || {};
  const street = sanitizeValue(components.street) || sanitizeValue(detail.displayAddress);
  const postcode = sanitizeValue(components.postcode);
  const outcode =
    sanitizeValue(components.outcode) ||
    (postcode ? postcode.split(/\s+/)[0] : null) ||
    sanitizeValue(entry.outcode);
  const localityName = sanitizeValue(detail.locality?.name) || sanitizeValue(entry.city);
  const boroughName = sanitizeValue(detail.borough?.name);
  const neighbourhoodName =
    sanitizeValue(detail.neighbourhood?.name) ||
    sanitizeValue(detail.macrohood?.name);

  const fullAddress =
    buildFullAddress({
      street,
      neighbourhood: neighbourhoodName,
      borough: boroughName,
      locality: localityName,
      postcode,
      outcode,
    }) || entry.displayAddress || entry.title;

  entry.displayAddress = fullAddress;
  entry.title = fullAddress;
  entry.city = localityName || entry.city || null;
  entry.outcode = outcode || null;

  entry.address = {
    street: street || null,
    locality: localityName || null,
    borough: boroughName || null,
    neighbourhood: neighbourhoodName || null,
    postcode: postcode || null,
    outcode: outcode || null,
  };

  const regionValues = new Set(
    (Array.isArray(entry.matchingRegions) ? entry.matchingRegions : [])
      .map((value) => sanitizeValue(value))
      .filter(Boolean)
  );
  [neighbourhoodName, boroughName, localityName, postcode, outcode].forEach((value) => {
    const clean = sanitizeValue(value);
    if (clean) {
      regionValues.add(clean);
    }
  });
  entry.matchingRegions = Array.from(regionValues);

  entry._scraye = {
    ...(entry._scraye || {}),
    placeName: sanitizeValue(entry._scraye?.placeName) || localityName || null,
    outcode: outcode || null,
    addressComponents: {
      street: street || null,
      postcode: postcode || null,
      outcode: outcode || null,
    },
    locality: detail.locality || null,
    borough: detail.borough || null,
    neighbourhood: detail.neighbourhood || detail.macrohood || null,
    displayAddress: detail.displayAddress || null,
  };
}

async function main() {
  const filePath = path.join(process.cwd(), 'data', 'scraye.json');
  const raw = await fs.readFile(filePath, 'utf8');
  const cache = JSON.parse(raw);
  const rentListings = Array.isArray(cache.rent) ? cache.rent : [];

  let processed = 0;
  let updated = 0;
  let failures = 0;

  const concurrency = 5;
  const active = new Set();

  const processEntry = async (entry) => {
    processed += 1;
    const id = entry?.sourceId || (entry?.id ? String(entry.id).replace(/^scraye-/, '') : null);
    if (!id) {
      return;
    }
    try {
      const detail = await fetchListingDetails(id);
      mergeAddressData(entry, detail);
      updated += 1;
    } catch (error) {
      failures += 1;
      console.warn(`Failed to enrich listing ${id}: ${error.message}`);
    }
  };

  for (const entry of rentListings) {
    const promise = processEntry(entry).finally(() => {
      active.delete(promise);
    });
    active.add(promise);
    if (active.size >= concurrency) {
      await Promise.race(active);
    }
  }

  await Promise.all(active);

  await fs.writeFile(filePath, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');

  console.log(
    `Processed ${processed} listings. Updated: ${updated}. Failures: ${failures}.`
  );
}

main().catch((error) => {
  console.error('Failed to enrich Scraye addresses', error);
  process.exitCode = 1;
});
