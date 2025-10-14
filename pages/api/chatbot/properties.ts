import type { NextApiRequest, NextApiResponse } from 'next';
import { applyApiHeaders, handlePreflight } from '../../../lib/api-helpers';
import { fetchPropertiesByType } from '../../../lib/apex27.mjs';

const DEFAULT_RESULT_LIMIT = 3;

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const numeric = Number(value.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return null;
}

function parseBedrooms(value: unknown): number | null {
  const numeric = parseNumber(value);
  return numeric != null ? Math.max(0, Math.round(numeric)) : null;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function computeLocationScore(property: Record<string, unknown>, tokens: string[]): number {
  if (!tokens.length) {
    return 0;
  }

  const fields = [
    property.title,
    property.address,
    property.area,
    property.city,
    property.county,
    Array.isArray(property.matchingRegions) ? property.matchingRegions.join(' ') : null,
    property.description,
  ]
    .flat()
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  if (!fields.length) {
    return 0;
  }

  let score = 0;
  tokens.forEach((token) => {
    fields.forEach((field, index) => {
      if (field.includes(token)) {
        score += 6 - Math.min(index, 5);
      }
    });
  });

  return score;
}

function getRecencyScore(property: Record<string, unknown>): number {
  const candidates = [property.updatedAt, property.createdAt];
  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const parsed = Date.parse(candidate);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return 0;
}

function formatProperty(property: Record<string, unknown>, fallbackType: string) {
  const id = property.id != null ? String(property.id) : null;
  const link =
    typeof property.link === 'string'
      ? property.link
      : typeof property.externalUrl === 'string'
        ? property.externalUrl
        : id
          ? `/property/${encodeURIComponent(id)}`
          : null;

  const images = Array.isArray(property.images) ? property.images : [];

  return {
    id,
    title: property.title ?? property.displayAddress ?? 'Property listing',
    address: property.address ?? property.displayAddress ?? null,
    price: property.price ?? null,
    summary: property.description ?? null,
    transactionType: property.transactionType ?? fallbackType,
    bedrooms: property.bedrooms ?? null,
    status: property.status ?? null,
    image: images.length ? images[0] : property.image ?? null,
    link,
  };
}

async function parseBody(req: NextApiRequest): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>;
  }

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch (error) {
      throw new Error('Invalid JSON payload');
    }
  }

  return {};
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  applyApiHeaders(req, res, { methods: ['POST'] as const });
  if (handlePreflight(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = await parseBody(req);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request body' });
    return;
  }

  const location = normalizeText(body.location);
  const minPrice = parseNumber(body.minPrice);
  const maxPrice = parseNumber(body.maxPrice);
  const bedrooms = parseBedrooms(body.bedrooms);
  const propertyType = normalizeText(body.propertyType);
  const transactionType = normalizeText(body.transactionType) === 'sale' ? 'sale' : 'rent';

  const locationTokens = location
    ? location
        .split(/[\s,]+/)
        .map((token) => token.trim().toLowerCase())
        .filter(Boolean)
    : [];

  try {
    const rawProperties = await fetchPropertiesByType(transactionType, {
      minPrice: minPrice ?? undefined,
      maxPrice: maxPrice ?? undefined,
      bedrooms: bedrooms ?? undefined,
      propertyType: propertyType ?? undefined,
      allowNetwork: true,
    });

    type ScoredProperty = {
      property: Record<string, unknown>;
      score: number;
      recency: number;
    };

    const withScores: ScoredProperty[] = rawProperties.map((property: Record<string, unknown>) => {
      const score = computeLocationScore(property, locationTokens);
      const recency = getRecencyScore(property);
      return { property, score, recency };
    });

    let filtered: ScoredProperty[] = withScores;
    if (locationTokens.length) {
      filtered = withScores.filter((entry) => entry.score > 0);
      if (!filtered.length) {
        filtered = withScores;
      }
    }

    const sorted = filtered
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return b.recency - a.recency;
      })
      .slice(0, DEFAULT_RESULT_LIMIT);

    const results = sorted.map((entry) =>
      formatProperty(entry.property, transactionType),
    );

    res.status(200).json({
      ok: true,
      results,
      filters: {
        location,
        minPrice,
        maxPrice,
        bedrooms,
        propertyType,
        transactionType,
      },
    });
  } catch (error) {
    console.error('Failed to load chatbot property results', error);
    res.status(500).json({ error: 'Failed to fetch property listings' });
  }
}
