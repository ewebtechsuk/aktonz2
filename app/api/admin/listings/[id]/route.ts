import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { logError, logInfo, logWarn } from "@/lib/server/logger";
// @ts-expect-error -- legacy admin listing utilities are JavaScript modules
import {
  AdminListingValidationError,
  getLettingsListingById,
  serializeListing,
  updateLettingsListingById,
} from "@/lib/admin-listings.mjs";
// @ts-expect-error -- admin session helpers are JavaScript modules
import { getAdminFromSession } from "@/lib/admin-users.mjs";
// @ts-expect-error -- admin offers helpers are JavaScript modules
import { listOffersForAdmin } from "@/lib/offers-admin.mjs";
// @ts-expect-error -- admin maintenance helpers are JavaScript modules
import { listMaintenanceTasksForAdmin } from "@/lib/maintenance-admin.mjs";
// @ts-expect-error -- property identifier helpers are JavaScript modules
import { normalizePropertyIdentifierForComparison } from "@/lib/property-id.mjs";
import { readSession } from "@/lib/session.js";

type AdminCheck = { admin: unknown } | { response: NextResponse };

function getEnv(name: string, required = false): string | undefined {
  const value = process.env[name];
  if (required && (!value || value.trim() === "")) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function seconds(name: string, fallback: number) {
  const raw = process.env[name];
  const numeric = raw ? Number(raw) : NaN;
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function buildSessionRequest(request: NextRequest) {
  const cookies = Object.fromEntries(
    request.cookies
      .getAll()
      .map(({ name, value }) => [name, value] as const),
  );

  return {
    cookies,
    headers: {
      cookie: request.headers.get("cookie") ?? "",
    },
  };
}

function requireAdmin(request: NextRequest): AdminCheck {
  const session = readSession(buildSessionRequest(request));
  const admin = getAdminFromSession(session);

  if (!admin) {
    return {
      response: NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 },
      ),
    };
  }

  return { admin };
}

function registerId(value: unknown, collection: Set<string>) {
  if (value == null) {
    return;
  }

  const normalized = normalizePropertyIdentifierForComparison(value);
  if (normalized) {
    collection.add(normalized);
  }
}

function matchesListing(candidates: unknown[] = [], comparisonIds: Set<string>) {
  for (const candidate of candidates) {
    const normalized = normalizePropertyIdentifierForComparison(candidate);
    if (normalized && comparisonIds.has(normalized)) {
      return true;
    }
  }
  return false;
}

async function handleInternalListing(id: string) {
  try {
    const listing = await getLettingsListingById(id);
    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 },
      );
    }

    const serialized = serializeListing(listing);
    const comparisonIds = new Set<string>();

    registerId(id, comparisonIds);
    registerId(serialized?.id, comparisonIds);
    registerId(serialized?.reference, comparisonIds);
    registerId(listing?.raw?.id, comparisonIds);
    registerId(listing?.raw?.externalId, comparisonIds);
    registerId(listing?.raw?.externalReference, comparisonIds);
    registerId(listing?.raw?.sourceId, comparisonIds);
    registerId(listing?.raw?.fullReference, comparisonIds);

    const [offers, maintenance] = await Promise.all([
      listOffersForAdmin(),
      listMaintenanceTasksForAdmin(),
    ]);

    const linkedOffers = offers.filter((offer: any) =>
      matchesListing(
        [
          offer?.property?.id,
          offer?.property?.reference,
          offer?.property?.externalReference,
          offer?.property?.sourceId,
          offer?.propertyId,
        ],
        comparisonIds,
      ),
    );

    const linkedMaintenance = maintenance.filter((task: any) =>
      matchesListing(
        [
          task?.property?.id,
          task?.property?.reference,
          task?.property?.externalReference,
        ],
        comparisonIds,
      ),
    );

    return NextResponse.json({
      listing: {
        ...serialized,
        offers: linkedOffers,
        maintenanceTasks: linkedMaintenance,
      },
    });
  } catch (error: any) {
    logError("Failed to load admin listing", {
      id,
      message: error?.message || String(error),
      stack: error?.stack?.slice(0, 500),
    });
    return NextResponse.json(
      { error: "Failed to load listing" },
      { status: 500 },
    );
  }
}

async function handleScrayeListing(id: string) {
  const startedAt = Date.now();

  const base = getEnv("SCRAYE_API_BASE", true)!;
  const key = getEnv("SCRAYE_API_KEY", true)!;

  const externalId = id.replace(/^scraye-/, "");
  const timeoutSec = seconds("LISTING_FETCH_TIMEOUT_SECONDS", 12);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutSec * 1000);

  const url = `${base.replace(/\/+$/, "")}/listings/${encodeURIComponent(externalId)}`;

  const upstream = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
    signal: controller.signal,
    cache: "no-store",
  }).catch((err) => {
    throw new Error(`Upstream fetch failed: ${err?.message || String(err)}`);
  });

  clearTimeout(timeout);

  const age = Date.now() - startedAt;

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "(no body)");
    logWarn("Upstream non-2xx", {
      id,
      status: upstream.status,
      body: text.slice(0, 400),
      ms: age,
    });

    if (upstream.status === 404) {
      return NextResponse.json(
        {
          error: "Listing not found",
          code: "NOT_FOUND",
          provider: "scraye",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error: "Provider error",
        code: "UPSTREAM_ERROR",
        provider: "scraye",
        status: upstream.status,
      },
      { status: 502 },
    );
  }

  const data = await upstream.json().catch(() => null);
  if (!data) {
    logWarn("Upstream returned non-JSON body", { id, ms: age });
    return NextResponse.json(
      { error: "Invalid provider response", code: "BAD_UPSTREAM_BODY" },
      { status: 502 },
    );
  }

  const normalized = { provider: "scraye", id, payload: data };

  const maxAge = seconds("LISTING_MAX_AGE_SECONDS", 60);
  const response = NextResponse.json({ listing: normalized }, { status: 200 });
  response.headers.set(
    "Cache-Control",
    `public, s-maxage=${maxAge}, stale-while-revalidate=${Math.max(1, maxAge)}`,
  );

  logInfo("Listing served", { id, ms: age });
  return response;
}

export async function HEAD(request: NextRequest) {
  const adminCheck = requireAdmin(request);
  if ("response" in adminCheck) {
    return adminCheck.response;
  }

  return new NextResponse(null, { status: 200 });
}

async function resolveRouteId(
  params?: { id: unknown } | Promise<{ id: unknown }>,
): Promise<string | null> {
  const resolved = params && typeof (params as any)?.then === "function"
    ? await params
    : (params as { id: unknown } | undefined);

  const rawId = resolved?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  return typeof id === "string" && id.trim() ? id : null;
}

export async function GET(
  request: NextRequest,
  context: { params: { id: string } },
) {
  const adminCheck = requireAdmin(request);
  if ("response" in adminCheck) {
    return adminCheck.response;
  }

  const id = await resolveRouteId(context.params);
  if (!id) {
    return NextResponse.json(
      { error: "Missing listing id", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  try {
    if (id.startsWith("scraye-")) {
      return await handleScrayeListing(id);
    }

    return await handleInternalListing(id);
  } catch (error: any) {
    logError("API route crashed", {
      id,
      message: error?.message || String(error),
      stack: error?.stack?.slice(0, 500),
    });
    return NextResponse.json(
      { error: "Internal Server Error", code: "UNHANDLED_EXCEPTION" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } },
) {
  const adminCheck = requireAdmin(request);
  if ("response" in adminCheck) {
    return adminCheck.response;
  }

  const id = await resolveRouteId(context.params);
  if (!id) {
    return NextResponse.json(
      { error: "Missing listing id", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  if (id.startsWith("scraye-")) {
    return NextResponse.json(
      { error: "Scraye listings are read-only", code: "SCRAYE_READ_ONLY" },
      { status: 405 },
    );
  }

  let updates: any = {};
  try {
    updates = await request.json();
  } catch {
    updates = {};
  }

  try {
    const listing = await updateLettingsListingById(id, updates && typeof updates === "object" ? updates : {});

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      listing: serializeListing(listing, { includeRaw: true, includeApexFields: true }),
    });
  } catch (error: any) {
    if (error instanceof AdminListingValidationError) {
      return NextResponse.json(
        { error: error.message, details: error.messages },
        { status: 400 },
      );
    }

    logError("Failed to update admin listing", {
      id,
      message: error?.message || String(error),
      stack: error?.stack?.slice(0, 500),
    });
    return NextResponse.json(
      { error: "Failed to update listing" },
      { status: 500 },
    );
  }
}
