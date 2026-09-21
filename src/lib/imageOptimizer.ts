import { 
  isGoogleDriveUrl, 
  extractGoogleDriveId, 
  isCloudinaryImageUrl, 
  isCloudinaryVideoUrl,
  getOptimizedCloudinaryImageUrl,
  getOptimizedCloudinaryPosterUrl,
  isImageKitImageUrl,
  isImageKitVideoUrl,
  getOptimizedImageKitImageUrl,
  getOptimizedImageKitPosterUrl,
  isImgurUrl,
  getDirectImgurUrl,
  isPngUrl
} from "./mediaUtils";

/**
 * Image Optimizer Utility for TETRA HATS
 * Converts heavy raw PNG images, ImageKit.io media, Cloudinary media, and Google Drive links
 * into ultra-fast compressed, auto-formatted (WebP/AVIF) CDN thumbnails,
 * while strictly preserving PNG alpha transparency for logos and transparent products.
 */

export function getOptimizedImageUrl(
  url: string | null | undefined,
  targetWidth: number = 600,
  options?: { preserveTransparency?: boolean }
): string {
  if (!url || typeof url !== "string") return "";

  let trimmed = url.trim();
  if (!trimmed) return "";

  // Clean broken placeholder patterns
  if (trimmed.includes("df3fh9wic")) {
    return "";
  }

  const preserveTransparency = Boolean(options?.preserveTransparency || isPngUrl(trimmed));

  // 1. Check if it's an ImageKit.io image URL
  if (isImageKitImageUrl(trimmed)) {
    return getOptimizedImageKitImageUrl(trimmed, targetWidth, { preserveTransparency });
  }

  // 2. Check if it's an ImageKit.io video URL being used as an image (generate dynamic /ik-thumbnail.jpg)
  if (isImageKitVideoUrl(trimmed)) {
    return getOptimizedImageKitPosterUrl(trimmed, targetWidth, "1");
  }

  // 3. Check if it's a Cloudinary image URL
  if (isCloudinaryImageUrl(trimmed)) {
    return getOptimizedCloudinaryImageUrl(trimmed, targetWidth, { preserveTransparency });
  }

  // 4. Check if it's a Cloudinary video URL being used as an image (convert to instant frame thumbnail)
  if (isCloudinaryVideoUrl(trimmed)) {
    return getOptimizedCloudinaryPosterUrl(trimmed, targetWidth);
  }

  // 5. Check if it's an Imgur image URL (supports gallery, album, or direct links)
  if (isImgurUrl(trimmed)) {
    return getDirectImgurUrl(trimmed, targetWidth, { preserveTransparency });
  }

  // 6. Check if it's a Google Drive link
  if (isGoogleDriveUrl(trimmed)) {
    const fileId = extractGoogleDriveId(trimmed);
    if (fileId) {
      // lh3.googleusercontent.com/d/FILE_ID serves direct image stream preserving original PNG alpha transparency
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }

  // 7. Check if it's an Umbra / Shopify CDN URL (e.g. https://umbra.page/cdn/shop/files/25.png)
  if (
    trimmed.includes("cdn/shop") ||
    trimmed.includes("umbra.page") ||
    trimmed.includes("cdn.shopify.com")
  ) {
    try {
      const urlObj = new URL(trimmed);

      // Set width & format query parameters for CDN auto-compression
      urlObj.searchParams.set("width", targetWidth.toString());
      if (preserveTransparency) {
        urlObj.searchParams.set("format", "png");
      }
      
      // Preserve exact original pathname to avoid 404s on custom proxies
      return urlObj.toString();
    } catch {
      return `${trimmed}?width=${targetWidth}${preserveTransparency ? "&format=png" : ""}`;
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
        img.referrerPolicy = "no-referrer";
        img.src = optimizedUrl;
      }
    }
  });
}
