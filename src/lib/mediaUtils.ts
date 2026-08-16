/**
 * Google Drive, Cloudinary & Multimedia Optimization Utilities
 * Allows seamless embedding, ultra-fast streaming and compression of multimedia
 * by extracting File IDs and converting them to direct high-speed CDN streams,
 * dynamic transformations (f_auto, q_auto, vc_auto) and instant posters.
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

  // Pattern 3: lh3.googleusercontent.com/d/FILE_ID
  const lh3Match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (lh3Match && lh3Match[1]) return lh3Match[1];

  return null;
}

export function isGoogleDriveUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  return url.includes("drive.google.com") || url.includes("googleusercontent.com");
}

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
 * Optimizes a Cloudinary video URL by injecting f_auto, q_auto:eco, vc_auto and max dimension limit
 * This reduces video file transfer size by 70%-90% and enables instant streaming.
 */
export function getOptimizedCloudinaryVideoUrl(
  url: string,
  options?: { width?: number; quality?: string }
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

    const width = options?.width || 1280;
    const quality = options?.quality || "auto";
    const transforms = `f_auto,q_${quality},vc_auto,w_${width},c_limit`;

    return `${before}/video/upload/${transforms}/${cleanPath}`;
  } catch {
    return url;
  }
}

/**
 * Generates an instant ~20KB lightweight frame snapshot poster (.jpg) from a Cloudinary video URL
 * Cloudinary can extract content-aware frame (so_auto) or offset frame (so_1.0) and output as an instant .jpg
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
    // High-speed CDN stream for HTML5 <video> and <img>
    directUrl: `https://lh3.googleusercontent.com/d/${fileId}=m22`,
    // Download / direct stream fallback
    streamUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
    // Embedded Google Drive preview player for iframe fallback
    embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
    // Fast CDN Thumbnail for posters / images
    thumbnailUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`
  };
}

