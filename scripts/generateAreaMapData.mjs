import fs from 'fs/promises';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import { simplify } from '@turf/turf';
import { HttpsProxyAgent } from 'https-proxy-agent';

const proxyUrl = process.env.https_proxy || process.env.HTTPS_PROXY || null;
const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'area-map.json');
const SOURCE_URL = 'https://raw.githubusercontent.com/martinjc/UK-GeoJSON/master/json/administrative/eng/lad.json';

const regionDefinitions = [
  {
    name: 'Central London',
    slug: 'central-london',
    boroughs: [
      'Camden',
      'City of London',
      'Islington',
      'Kensington and Chelsea',
      'Westminster',
    ],
  },
  {
    name: 'North London',
    slug: 'north-london',
    boroughs: ['Barnet', 'Enfield', 'Haringey'],
  },
  {
    name: 'North West London',
    slug: 'northwest-london',
    boroughs: ['Brent', 'Harrow'],
  },
  {
    name: 'West London',
    slug: 'west-london',
    boroughs: ['Ealing', 'Hammersmith and Fulham', 'Hillingdon', 'Hounslow'],
  },
  {
    name: 'South West London',
    slug: 'southwest-london',
    boroughs: [
      'Kingston upon Thames',
      'Merton',
      'Richmond upon Thames',
      'Sutton',
      'Wandsworth',
    ],
  },
  {
    name: 'South London',
    slug: 'south-london',
    boroughs: ['Croydon', 'Lambeth'],
  },
  {
    name: 'South East London',
    slug: 'southeast-london',
    boroughs: ['Bexley', 'Bromley', 'Greenwich', 'Lewisham', 'Southwark'],
  },
  {
    name: 'East London',
    slug: 'east-london',
    boroughs: ['Barking and Dagenham', 'Havering', 'Newham', 'Tower Hamlets'],
  },
  {
    name: 'North East London',
    slug: 'northeast-london',
    boroughs: ['Hackney', 'Redbridge', 'Waltham Forest'],
  },
];

const boroughNames = new Set(regionDefinitions.flatMap((region) => region.boroughs));

const slugify = (str) =>
  str
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function convertGeometry(geometry) {
  const round = (value) => Number(value.toFixed(6));
  const convertRing = (ring) => ring.map(([lng, lat]) => [round(lat), round(lng)]);

  if (geometry.type === 'Polygon') {
    return [geometry.coordinates.map(convertRing)];
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.map((polygon) => polygon.map(convertRing));
  }
  throw new Error(`Unsupported geometry type: ${geometry.type}`);
}

function downloadJson(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error('Too many redirects fetching source data'));
      return;
    }
    const req = https.get(url, { agent: proxyAgent }, (res) => {
      const { statusCode, headers } = res;
      if (statusCode && statusCode >= 300 && statusCode < 400 && headers.location) {
        res.resume();
        resolve(downloadJson(headers.location, redirectCount + 1));
        return;
      }
      if (statusCode !== 200) {
        res.resume();
        reject(new Error(`Failed to download source data: HTTP ${statusCode}`));
        return;
      }
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        raw += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
  });
}

async function main() {
  const data = await downloadJson(SOURCE_URL);
  const boroughFeatures = new Map();

  for (const feature of data.features) {
    const name = feature.properties?.LAD13NM;
    if (!boroughNames.has(name)) continue;

    const simplified = simplify(feature, { tolerance: 0.0005, highQuality: false });
    boroughFeatures.set(name, {
      name,
      slug: slugify(name),
      coords: convertGeometry(simplified.geometry),
    });
  }

  if (boroughFeatures.size !== boroughNames.size) {
    const missing = [...boroughNames].filter((name) => !boroughFeatures.has(name));
    throw new Error(`Missing boroughs: ${missing.join(', ')}`);
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: SOURCE_URL,
    mainRegions: [],
    subRegions: {},
  };

  for (const region of regionDefinitions) {
    const boroughs = region.boroughs.map((name) => boroughFeatures.get(name));
    const copyPoly = (poly) => poly.map((ring) => ring.map((point) => [...point]));
    output.mainRegions.push({
      name: region.name,
      slug: region.slug,
      coords: boroughs.flatMap((borough) => borough.coords.map(copyPoly)),
    });
    output.subRegions[region.slug] = boroughs.map((borough) => ({
      name: borough.name,
      slug: borough.slug,
      coords: borough.coords.map(copyPoly),
    }));
  }

  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
