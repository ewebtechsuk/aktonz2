// lib/client/api.ts
function resolveBasePath() {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BASE_PATH) {
    return process.env.NEXT_PUBLIC_BASE_PATH;
  }
  if (typeof window !== "undefined") {
    const prefix = ((window as any).__NEXT_DATA__?.assetPrefix as string | undefined) || "";
    if (prefix) {
      return prefix;
    }
  }
  return "";
}

export async function fetchListing(id: string) {
  const basePath = resolveBasePath();
  const url = `${basePath}/api/admin/listings/${encodeURIComponent(id)}`;

  const res = await fetch(url, {
    method: "GET",
  });

  if (!res.ok) {
    let details: any = null;
    try {
      details = await res.json();
    } catch (error) {
      // ignore JSON parsing errors
    }
    const reason = details?.error || details?.code || res.statusText;
    throw new Error(`Failed to fetch listing (${res.status}): ${reason}`);
  }

  return res.json();
}
