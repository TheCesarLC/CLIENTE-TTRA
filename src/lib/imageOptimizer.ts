import { isGoogleDriveUrl, extractGoogleDriveId } from "./mediaUtils";

/**
 * Image Optimizer Utility for TETRA HATS & Umbra CDN
 * Converts heavy raw PNG images and Google Drive links into ultra-fast CDN thumbnails
 */

export function getOptimizedImageUrl(
  url: string | null | undefined,
  targetWidth: number = 600
): string {
  if (!url || typeof url !== "string") return "";

  const trimmed = url.trim();
  if (!trimmed) return "";

  // Check if it's a Google Drive link
  if (isGoogleDriveUrl(trimmed)) {
    const fileId = extractGoogleDriveId(trimmed);
    if (fileId) {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${targetWidth}`;
    }
  }

  // Check if it's an Umbra / Shopify CDN URL (e.g. https://umbra.page/cdn/shop/files/25.png)
  if (
    trimmed.includes("cdn/shop") ||
    trimmed.includes("umbra.page") ||
    trimmed.includes("cdn.shopify.com")
  ) {
    try {
      const urlObj = new URL(trimmed);

      // Set width & format query parameters for CDN auto-compression
      urlObj.searchParams.set("width", targetWidth.toString());
      
      // Preserve exact original pathname to avoid 404s on custom proxies
      return urlObj.toString();
    } catch {
      return `${trimmed}?width=${targetWidth}`;
    }
  }

  return trimmed;
}

// In-memory cache for preloaded images
const preloadedCache = new Set<string>();

/**
 * Preloads a list of image URLs into browser cache silently and instantly
 */
export function preloadImages(urls: string[], width: number = 600): void {
  if (!Array.isArray(urls)) return;
  urls.forEach((url) => {
    if (url && typeof url === "string" && url.trim().length > 0) {
      const optimizedUrl = getOptimizedImageUrl(url, width);
      if (!preloadedCache.has(optimizedUrl)) {
        preloadedCache.add(optimizedUrl);
        const img = new Image();
        img.src = optimizedUrl;
      }
    }
  });
}
