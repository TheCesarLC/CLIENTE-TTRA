// Centralized API Client with automated failover and multi-domain support
// Ensures Stripe & Mercado Pago payments work across all environments:
// Localhost, AI Studio Preview, and Published Custom Domains (tetra-hats.com, etc.)

export const DEFAULT_BACKEND_URL = "https://ais-pre-25eymrex6e55en2kvnwszg-196565530914.us-west2.run.app";

/**
 * Resolves the appropriate API URL based on the current execution environment.
 */
export const getApiUrl = (endpoint: string, customBackendUrl?: string): string => {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  if (customBackendUrl && customBackendUrl.trim().startsWith("http")) {
    return `${customBackendUrl.trim().replace(/\/$/, "")}${cleanEndpoint}`;
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // When running inside the container (localhost or Cloud Run dev/preview), relative path connects directly to the bundled Express server
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".run.app")) {
      return cleanEndpoint;
    }
  }

  // When loaded on a custom published domain (e.g. tetra-hats.com, www.tetra-hats.com) or static CDN/hosting,
  // route backend payment requests to the live Cloud Run backend with full CORS support.
  return `${DEFAULT_BACKEND_URL}${cleanEndpoint}`;
};

/**
 * Robust POST request handler with automatic fallback to the live production backend.
 */
export async function postApi(
  endpoint: string,
  body: any,
  customBackendUrl?: string
): Promise<{ res: Response; data: any }> {
  const primaryUrl = getApiUrl(endpoint, customBackendUrl);
  const clientOrigin = typeof window !== "undefined" ? window.location.origin : "";
  
  const payload = {
    ...body,
    clientOrigin: body?.clientOrigin || clientOrigin,
  };

  try {
    const res = await fetch(primaryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // If local relative call returns 404 (e.g., static hosting without server.ts), fallback to live Cloud Run backend
    if ((res.status === 404 || !res.ok) && primaryUrl.startsWith("/")) {
      const fallbackUrl = `${DEFAULT_BACKEND_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
      try {
        const fallbackRes = await fetch(fallbackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const fallbackData = await fallbackRes.json().catch(() => ({}));
        return { res: fallbackRes, data: fallbackData };
      } catch (fallbackErr) {
        // Return original response if fallback fails
      }
    }

    const data = await res.json().catch(() => ({}));
    return { res, data };
  } catch (networkErr) {
    // If relative network fetch failed completely, attempt fallback to Cloud Run
    if (primaryUrl.startsWith("/")) {
      const fallbackUrl = `${DEFAULT_BACKEND_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
      const fallbackRes = await fetch(fallbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await fallbackRes.json().catch(() => ({}));
      return { res: fallbackRes, data };
    }
    throw networkErr;
  }
}
