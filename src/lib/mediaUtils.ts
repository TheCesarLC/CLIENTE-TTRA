/**
 * Google Drive & Multimedia Optimization Utilities
 * Allows seamless embedding and playback of Google Drive files (Videos, Images)
 * by extracting File IDs and converting them to direct high-speed streams & optimized embeds.
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
    directUrl: `https://lh3.googleusercontent.com/d/${fileId}`,
    // Download export URL fallback
    streamUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
    // Embedded Google Drive preview player for iframe fallback
    embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
    // Fast CDN Thumbnail for posters / images
    thumbnailUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`
  };
}
