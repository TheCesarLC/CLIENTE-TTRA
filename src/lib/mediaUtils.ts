/**
 * Multimedia & CDN Optimization Utilities (ImageKit.io, Cloudinary & Google Drive)
 * Allows seamless embedding, ultra-fast global CDN streaming, dynamic transformations 
 * (f-auto, q-auto, w-xxx, ik-thumbnail) and instant posters.
 */

export function extractGoogleDriveId(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();

  // Pattern 1: /file/d/FILE_ID/
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];

  // Pattern 2: id=FILE_ID or ?id=FILE_ID
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) return idMatch[1];

  // Pattern 3: /d/FILE_ID
  const lh3Match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (lh3Match && lh3Match[1]) return lh3Match[1];

  // Pattern 4: /folders/FILE_ID or /open?id=FILE_ID or /uc?id=FILE_ID
  const openMatch = trimmed.match(/(?:open|uc|file|thumbnail)\?(?:[^&]*&)*id=([a-zA-Z0-9_-]+)/);
  if (openMatch && openMatch[1]) return openMatch[1];

  return null;
}

export function isGoogleDriveUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  return (
    url.includes("drive.google.com") ||
    url.includes("googleusercontent.com") ||
    url.includes("docs.google.com")
  );
}

export function getDriveDirectImageUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "";
  const fileId = extractGoogleDriveId(url);
  if (!fileId) return url;
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

// ----------------------------------------------------
// ImageKit.io Support & Optimization Engine
// ----------------------------------------------------

export function isImageKitUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  return trimmed.includes("ik.imagekit.io") || trimmed.includes("imagekit.io");
}

export function isImageKitVideoUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  if (!isImageKitUrl(url)) return false;
  const trimmed = url.trim();
  return (
    /\.(mp4|mov|webm|mkv|avi|m4v)(\?.*)?$/i.test(trimmed) ||
    trimmed.includes("/ik-video/") ||
    trimmed.includes("f-mp4") ||
    trimmed.includes("f-webm")
  );
}

export function isImageKitImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  if (!isImageKitUrl(url)) return false;
  return !isImageKitVideoUrl(url);
}

/**
 * Optimizes an ImageKit.io image with automatic format selection (WebP/AVIF),
 * intelligent compression (q-80) and responsive width constraint.
 */
export function getOptimizedImageKitImageUrl(
  url: string,
  targetWidth: number = 600
): string {
  if (!url || !isImageKitImageUrl(url)) return url;

  try {
    const trimmed = url.trim();
    const urlObj = new URL(trimmed);

    // If URL already has path transformation (e.g. /tr:w-300,q-80/), clean and replace
    const pathSegments = urlObj.pathname.split("/");
    const trIndex = pathSegments.findIndex((seg) => seg.startsWith("tr:"));

    if (trIndex !== -1) {
      // Replace existing path transformation with optimal targetWidth
      pathSegments[trIndex] = `tr:w-${targetWidth},f-auto,q-80`;
      urlObj.pathname = pathSegments.join("/");
      // Remove conflicting query transformation
      urlObj.searchParams.delete("tr");
      return urlObj.toString();
    }

    // Otherwise use universal query-based transformation
    urlObj.searchParams.set("tr", `w-${targetWidth},f-auto,q-80`);
    return urlObj.toString();
  } catch {
    // Fallback simple query append
    const clean = url.trim();
    return clean.includes("?") 
      ? `${clean}&tr=w-${targetWidth},f-auto,q-80` 
      : `${clean}?tr=w-${targetWidth},f-auto,q-80`;
  }
}

/**
 * Optimizes an ImageKit.io video URL with fast web streaming.
 * In ImageKit, transforming videos (e.g., tr:w-xxx) consumes transformation credits.
 * When limits are exceeded, ImageKit returns HTTP 403 (ELIMIT).
 * Using tr=orig delivers the original MP4 video directly via CloudFront CDN
 * with HTTP 200 OK, full HTTP byte-range seeking, and zero transformation quota penalties.
 */
export function getOptimizedImageKitVideoUrl(
  url: string,
  options?: { width?: number; quality?: string; isHero?: boolean }
): string {
  if (!url || typeof url !== "string" || !isImageKitUrl(url)) return url;

  try {
    const trimmed = url.trim();
    const urlObj = new URL(trimmed);

    // Clean any prior path-based transformations (e.g. /tr:w-720/)
    const pathSegments = urlObj.pathname.split("/").filter((seg) => !seg.startsWith("tr:"));
    urlObj.pathname = pathSegments.join("/");

    // Clean any conflicting transformation query parameter
    urlObj.searchParams.delete("tr");

    // Deliver original MP4 file directly via CDN (status 200 OK, no 403 ELIMIT)
    urlObj.searchParams.set("tr", "orig");
    return urlObj.toString();
  } catch {
    const clean = url.trim();
    return clean.includes("?") 
      ? `${clean}&tr=orig` 
      : `${clean}?tr=orig`;
  }
}

/**
 * Extracts poster for ImageKit assets.
 * For videos, /ik-thumbnail.jpg requires video transformation credits and returns 403 ELIMIT
 * when account limits are reached. Therefore, we return empty string for videos so the player
 * immediately uses the high-res product photo as the reliable poster.
 */
export function getOptimizedImageKitPosterUrl(
  url: string,
  targetWidth: number = 600,
  startOffset: string = "1"
): string {
  if (!url || typeof url !== "string" || !isImageKitUrl(url)) return "";

  try {
    const trimmed = url.trim();

    // If it's already an image, optimize it directly as poster
    if (!isImageKitVideoUrl(trimmed)) {
      return getOptimizedImageKitImageUrl(trimmed, targetWidth);
    }

    // For videos, return empty string so fallbackPoster (product image) is used cleanly
    return "";
  } catch {
    return "";
  }
}

// ----------------------------------------------------
// Cloudinary Support & Optimization Engine
// ----------------------------------------------------

export function isCloudinaryUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  return url.includes("res.cloudinary.com") || url.includes("cloudinary.com");
}

export function isCloudinaryVideoUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  if (!isCloudinaryUrl(url)) return false;
  return (
    url.includes("/video/upload/") ||
    /\.(mp4|mov|webm|mkv|avi|m4v)(\?.*)?$/i.test(url) ||
    url.includes("/video/")
  );
}

export function isCloudinaryImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  if (!isCloudinaryUrl(url)) return false;
  return url.includes("/image/upload/") && !/\.(mp4|mov|webm|mkv|avi|m4v)(\?.*)?$/i.test(url);
}

/**
 * Optimizes a Cloudinary video URL by injecting f_mp4, q_auto:low/eco, w_xxx, c_limit for instant streaming
 */
export function getOptimizedCloudinaryVideoUrl(
  url: string,
  options?: { width?: number; quality?: string; isHero?: boolean }
): string {
  if (!url || typeof url !== "string" || !isCloudinaryUrl(url)) return url;

  try {
    let before = "";
    let after = "";
    if (url.includes("/video/upload/")) {
      [before, after] = url.split("/video/upload/");
    } else if (url.includes("/image/upload/")) {
      [before, after] = url.split("/image/upload/");
    } else {
      return url;
    }

    if (!after) return url;

    // Clean any previous transformation segment if present
    let cleanPath = after;
    const parts = cleanPath.split("/");
    if (parts.length > 1 && !/^v\d+$/i.test(parts[0]) && !/\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(parts[0])) {
      cleanPath = parts.slice(1).join("/");
    }

    const width = options?.width || (options?.isHero ? 720 : 480);
    const quality = options?.quality || "auto";
    const transforms = `q_${quality},w_${width},c_limit`;

    return `${before}/video/upload/${transforms}/${cleanPath}`;
  } catch {
    return url;
  }
}

/**
 * Generates an instant ~20KB lightweight frame snapshot poster (.jpg) from a Cloudinary video URL
 */
export function getOptimizedCloudinaryPosterUrl(
  url: string,
  targetWidth: number = 800,
  startOffset: string = "auto"
): string {
  if (!url || typeof url !== "string" || !isCloudinaryUrl(url)) return "";

  try {
    let before = "";
    let after = "";
    if (url.includes("/video/upload/")) {
      [before, after] = url.split("/video/upload/");
    } else if (url.includes("/image/upload/")) {
      [before, after] = url.split("/image/upload/");
    } else {
      return "";
    }

    if (!after) return "";

    let cleanPath = after;
    const parts = cleanPath.split("/");
    if (parts.length > 1 && !/^v\d+$/i.test(parts[0]) && !/\.(mp4|mov|webm|mkv|avi|m4v|jpg|jpeg|png|webp)$/i.test(parts[0])) {
      cleanPath = parts.slice(1).join("/");
    }

    let posterPath = cleanPath;
    if (/\.(mp4|mov|webm|mkv|avi|m4v)(\?.*)?$/i.test(posterPath)) {
      posterPath = posterPath.replace(/\.(mp4|mov|webm|mkv|avi|m4v)(\?.*)?$/i, ".jpg");
    } else if (!/\.(jpg|jpeg|png|webp|avif)$/i.test(posterPath)) {
      posterPath = `${posterPath}.jpg`;
    }

    const transforms = `so_${startOffset},f_auto,q_auto,w_${targetWidth},c_limit`;
    return `${before}/video/upload/${transforms}/${posterPath}`;
  } catch {
    return "";
  }
}

/**
 * Optimizes a Cloudinary image URL with f_auto, q_auto and width constraint
 */
export function getOptimizedCloudinaryImageUrl(
  url: string,
  targetWidth: number = 600
): string {
  if (!url || !isCloudinaryImageUrl(url)) return url;

  try {
    const [before, after] = url.split("/image/upload/");
    if (!after) return url;

    let cleanPath = after;
    const parts = cleanPath.split("/");
    if (parts.length > 1 && !/^v\d+$/i.test(parts[0]) && !/\.(jpg|jpeg|png|webp|avif|gif)$/i.test(parts[0])) {
      cleanPath = parts.slice(1).join("/");
    }

    const transforms = `f_auto,q_auto,w_${targetWidth},c_limit`;
    return `${before}/image/upload/${transforms}/${cleanPath}`;
  } catch {
    return url;
  }
}

export interface DriveMediaConfig {
  isDrive: boolean;
  fileId: string | null;
  directUrl: string;
  streamUrl: string;
  embedUrl: string;
  thumbnailUrl: string;
}

export function getDriveMediaConfig(url: string | null | undefined): DriveMediaConfig {
  if (!url || typeof url !== "string") {
    return { isDrive: false, fileId: null, directUrl: "", streamUrl: "", embedUrl: "", thumbnailUrl: "" };
  }

  const fileId = extractGoogleDriveId(url);
  if (!fileId) {
    return { isDrive: false, fileId: null, directUrl: url, streamUrl: url, embedUrl: url, thumbnailUrl: url };
  }

  return {
    isDrive: true,
    fileId,
    // High-speed direct stream
    directUrl: `https://lh3.googleusercontent.com/d/${fileId}=m22`,
    // Download fallback
    streamUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
    // Embedded preview player
    embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
    // Fast thumbnail
    thumbnailUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`
  };
}
