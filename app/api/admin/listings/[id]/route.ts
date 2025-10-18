// app/api/admin/listings/[id]/route.ts
import { NextResponse } from "next/server";
import { logError, logInfo, logWarn } from "@/lib/server/logger";

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

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const startedAt = Date.now();
  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { error: "Missing listing id", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const isScraye = id.startsWith("scraye-");

  try {
    if (isScraye) {
      const base = getEnv("SCRAYE_API_BASE", true)!;
      const key = getEnv("SCRAYE_API_KEY", true)!;

      const externalId = id.replace(/^scraye-/, "");

      const timeoutSec = seconds("LISTING_FETCH_TIMEOUT_SECONDS", 12);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutSec * 1000);

      const url = `${base.replace(/\/+$/, "")}/listings/${encodeURIComponent(
        externalId
      )}`;

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
            { status: 404 }
          );
        }

        return NextResponse.json(
          {
            error: "Provider error",
            code: "UPSTREAM_ERROR",
            provider: "scraye",
            status: upstream.status,
          },
          { status: 502 }
        );
      }

      const data = await upstream.json().catch(() => null);
      if (!data) {
        logWarn("Upstream returned non-JSON body", { id, ms: age });
        return NextResponse.json(
          { error: "Invalid provider response", code: "BAD_UPSTREAM_BODY" },
          { status: 502 }
        );
      }

      const normalized = { provider: "scraye", id, payload: data };

      const maxAge = seconds("LISTING_MAX_AGE_SECONDS", 60);
      const response = NextResponse.json({ listing: normalized }, { status: 200 });
      response.headers.set(
        "Cache-Control",
        `public, s-maxage=${maxAge}, stale-while-revalidate=${Math.max(1, maxAge)}`
      );

      logInfo("Listing served", { id, ms: age });
      return response;
    }

    return NextResponse.json(
      { error: "Unsupported listing id/provider", code: "UNSUPPORTED_ID" },
      { status: 400 }
    );
  } catch (err: any) {
    const message = err?.message || String(err);
    logError("API route crashed", {
      id,
      message,
      stack: err?.stack?.slice(0, 500),
    });
    return NextResponse.json(
      { error: "Internal Server Error", code: "UNHANDLED_EXCEPTION" },
      { status: 500 }
    );
  }
}
