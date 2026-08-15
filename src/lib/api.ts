// Centralized API Client
// Ensures Stripe, Mercado Pago, and all backend operations work smoothly across all environments:
// Localhost, AI Studio, and Vercel Deployments (tetra-hats.com, etc.)

export const getApiUrl = (endpoint: string, customBackendUrl?: string): string => {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  if (customBackendUrl && customBackendUrl.trim().startsWith("http")) {
    return `${customBackendUrl.trim().replace(/\/$/, "")}${cleanEndpoint}`;
  }

  // Always use the relative endpoint so it connects to the same host (Vercel serverless / Express server)
  return cleanEndpoint;
};

/**
 * Robust POST request handler for Stripe & Mercado Pago endpoints.
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

  const res = await fetch(primaryUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  return { res, data };
}
