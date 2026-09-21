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

export function isPngUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const clean = url.trim().toLowerCase();
  return (
    clean.includes(".png") ||
    clean.includes("format=png") ||
    clean.includes("f_png") ||
    clean.includes("f-png") ||
    clean.includes("fm=png") ||
    clean.includes("image/png")
  );
}

export function isImageKitImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  if (!isImageKitUrl(url)) return false;
  return !isImageKitVideoUrl(url);
}

/**
 * Optimizes an ImageKit.io image with automatic format selection (WebP/AVIF)
 * or preserves PNG transparency (f-png) when the original is a transparent PNG or requested.
 */
export function getOptimizedImageKitImageUrl(
  url: string,
  targetWidth: number = 600,
  options?: { preserveTransparency?: boolean }
): string {
  if (!url || !isImageKitImageUrl(url)) return url;

  try {
    const trimmed = url.trim();
    const urlObj = new URL(trimmed);
    const isPng = options?.preserveTransparency || isPngUrl(trimmed);
    const formatParam = isPng ? "f-png" : "f-auto";

    // If URL already has path transformation (e.g. /tr:w-300,q-80/), clean and replace
    const pathSegments = urlObj.pathname.split("/");
    const trIndex = pathSegments.findIndex((seg) => seg.startsWith("tr:"));

    if (trIndex !== -1) {
      // Replace existing path transformation with optimal targetWidth and format
      pathSegments[trIndex] = `tr:w-${targetWidth},${formatParam},q-85`;
      urlObj.pathname = pathSegments.join("/");
      // Remove conflicting query transformation
      urlObj.searchParams.delete("tr");
      return urlObj.toString();
    }

    // Otherwise use universal query-based transformation
    urlObj.searchParams.set("tr", `w-${targetWidth},${formatParam},q-85`);
    return urlObj.toString();
  } catch {
    // Fallback simple query append
    const clean = url.trim();
    const isPng = options?.preserveTransparency || isPngUrl(clean);
    const formatParam = isPng ? "f-png" : "f-auto";
    return clean.includes("?") 
      ? `${clean}&tr=w-${targetWidth},${formatParam},q-85` 
      : `${clean}?tr=w-${targetWidth},${formatParam},q-85`;
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
 * Optimizes a Cloudinary image URL with f_auto or f_png (for alpha transparency) and width constraint
 */
export function getOptimizedCloudinaryImageUrl(
  url: string,
  targetWidth: number = 600,
  options?: { preserveTransparency?: boolean }
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

    const isPng = options?.preserveTransparency || isPngUrl(url);
    const formatParam = isPng ? "f_png" : "f_auto";
    const transforms = `${formatParam},q_auto,w_${targetWidth},c_limit`;
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

// ----------------------------------------------------
// YouTube Support & Optimization Engine
// ----------------------------------------------------

export interface YouTubeMediaConfig {
  isYouTube: boolean;
  videoId: string | null;
  isShort: boolean;
  embedUrl: string;
  thumbnailUrl: string | null;
}

export function isYouTubeUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim().toLowerCase();
  return (
    trimmed.includes("youtube.com") ||
    trimmed.includes("youtu.be") ||
    trimmed.includes("youtube-nocookie.com")
  );
}

export function extractYouTubeConfig(url: string | null | undefined): YouTubeMediaConfig {
  if (!url || typeof url !== "string") {
    return { isYouTube: false, videoId: null, isShort: false, embedUrl: "", thumbnailUrl: null };
  }
  const trimmed = url.trim();
  if (!isYouTubeUrl(trimmed)) {
    return { isYouTube: false, videoId: null, isShort: false, embedUrl: "", thumbnailUrl: null };
  }

  let videoId: string | null = null;
  let isShort = false;

  // 1. youtu.be/VIDEO_ID
  const shortLinkMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (shortLinkMatch && shortLinkMatch[1]) {
    videoId = shortLinkMatch[1];
  }

  // 2. youtube.com/shorts/VIDEO_ID
  if (!videoId) {
    const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
    if (shortsMatch && shortsMatch[1]) {
      videoId = shortsMatch[1];
      isShort = true;
    }
  }

  // 3. youtube.com/embed/VIDEO_ID or youtube-nocookie.com/embed/VIDEO_ID
  if (!videoId) {
    const embedMatch = trimmed.match(/youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
    if (embedMatch && embedMatch[1]) {
      videoId = embedMatch[1];
    }
  }

  // 4. youtube.com/live/VIDEO_ID
  if (!videoId) {
    const liveMatch = trimmed.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/i);
    if (liveMatch && liveMatch[1]) {
      videoId = liveMatch[1];
    }
  }

  // 5. Standard youtube.com/watch?v=VIDEO_ID (or m.youtube.com, music.youtube.com)
  if (!videoId) {
    const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
    if (watchMatch && watchMatch[1]) {
      videoId = watchMatch[1];
    }
  }

  // 6. Generic pattern matching 11-char video ID if domain is youtube
  if (!videoId) {
    const fallbackMatch = trimmed.match(/\/([a-zA-Z0-9_-]{11})(?:[/?&#]|$)/);
    if (fallbackMatch && fallbackMatch[1]) {
      videoId = fallbackMatch[1];
    }
  }

  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : trimmed;
  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;

  return {
    isYouTube: true,
    videoId,
    isShort,
    embedUrl,
    thumbnailUrl,
  };
}

export function getYouTubeEmbedUrl(
  url: string,
  options?: {
    isHero?: boolean;
    autoplay?: boolean;
    muted?: boolean;
    loop?: boolean;
    controls?: boolean;
  }
): string {
  const config = extractYouTubeConfig(url);
  if (!config.isYouTube || !config.videoId) return url;

  const videoId = config.videoId;
  const params = new URLSearchParams();

  // Safely resolve active domain origin for YouTube embed validation
  const currentOrigin =
    typeof window !== "undefined" && window.location && window.location.origin
      ? window.location.origin
      : "";

  if (options?.isHero) {
    // Ultra-clean ambient background video: no chrome, autoplay, mute, infinite loop
    params.set("autoplay", "1");
    params.set("mute", "1");
    params.set("controls", "0");
    params.set("loop", "1");
    params.set("playlist", videoId); // Required for looping single video in YouTube embed API
    params.set("playsinline", "1");
    params.set("rel", "0");
    params.set("showinfo", "0");
    params.set("iv_load_policy", "3");
    params.set("modestbranding", "1");
    params.set("disablekb", "1");
    params.set("fs", "0");
    if (currentOrigin) {
      params.set("origin", currentOrigin);
      params.set("widget_referrer", currentOrigin);
    }
  } else {
    // Interactive player mode
    if (options?.autoplay) params.set("autoplay", "1");
    if (options?.muted) params.set("mute", "1");
    if (options?.loop !== false) {
      params.set("loop", "1");
      params.set("playlist", videoId);
    }
    if (options?.controls === false) {
      params.set("controls", "0");
    } else {
      params.set("controls", "1");
    }
    params.set("playsinline", "1");
    params.set("rel", "0");
    params.set("modestbranding", "1");
    if (currentOrigin) {
      params.set("origin", currentOrigin);
      params.set("widget_referrer", currentOrigin);
    }
  }

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

// ----------------------------------------------------
// Universal Multimedia Origin Detection Engine
// ----------------------------------------------------

export interface MediaSourceInfo {
  provider:
    | "youtube"
    | "vimeo"
    | "google_drive"
    | "imagekit"
    | "cloudinary"
    | "imgur"
    | "direct_video"
    | "direct_image"
    | "unknown";
  label: string;
  badgeText: string;
  badgeBg: string;
  badgeBorder: string;
  badgeTextCol: string;
  badgeDotCol: string;
  description: string;
  isSupportedVideo: boolean;
  isSupportedImage: boolean;
  thumbnailUrl?: string | null;
  videoId?: string | null;
}

export function detectMediaSource(url: string | null | undefined): MediaSourceInfo {
  if (!url || typeof url !== "string" || !url.trim()) {
    return {
      provider: "unknown",
      label: "Sin Enlace",
      badgeText: "Esperando Enlace",
      badgeBg: "bg-neutral-900/60",
      badgeBorder: "border-neutral-800",
      badgeTextCol: "text-neutral-500",
      badgeDotCol: "bg-neutral-600",
      description: "Pega un enlace de YouTube, Vimeo, ImageKit, Cloudinary, Imgur o video directo.",
      isSupportedVideo: false,
      isSupportedImage: false,
    };
  }

  const trimmed = url.trim();

  // 1. YouTube Detection
  if (isYouTubeUrl(trimmed)) {
    const ytConfig = extractYouTubeConfig(trimmed);
    return {
      provider: "youtube",
      label: ytConfig.isShort ? "YouTube Shorts" : "YouTube Video",
      badgeText: ytConfig.isShort ? "YouTube Shorts Detectado" : "YouTube Video Detectado",
      badgeBg: "bg-red-500/10",
      badgeBorder: "border-red-500/30",
      badgeTextCol: "text-red-400",
      badgeDotCol: "bg-red-500",
      description: ytConfig.videoId 
        ? `Video ID: ${ytConfig.videoId}. Configurado automáticamente para reproducción fluida, sin anuncios emergentes y bucle continuo en el fondo superior.`
        : "Enlace de YouTube identificado.",
      isSupportedVideo: true,
      isSupportedImage: false,
      thumbnailUrl: ytConfig.thumbnailUrl,
      videoId: ytConfig.videoId,
    };
  }

  // 2. Vimeo Detection
  if (isVimeoUrl(trimmed)) {
    const vimeoConfig = extractVimeoConfig(trimmed);
    return {
      provider: "vimeo",
      label: "Vimeo Video",
      badgeText: "Vimeo Video Detectado",
      badgeBg: "bg-sky-500/10",
      badgeBorder: "border-sky-500/30",
      badgeTextCol: "text-sky-400",
      badgeDotCol: "bg-sky-400",
      description: vimeoConfig.videoId
        ? `Video ID: ${vimeoConfig.videoId}. Transmisión CDN global de Vimeo sin restricciones de ancho de banda y adaptación panorámica.`
        : "Enlace de Vimeo identificado.",
      isSupportedVideo: true,
      isSupportedImage: false,
      thumbnailUrl: vimeoConfig.videoId ? `https://vumbnail.com/${vimeoConfig.videoId}.jpg` : null,
      videoId: vimeoConfig.videoId,
    };
  }

  // 3. ImageKit.io Detection
  if (isImageKitUrl(trimmed)) {
    const isVideo = isImageKitVideoUrl(trimmed);
    return {
      provider: "imagekit",
      label: isVideo ? "ImageKit.io (Video)" : "ImageKit.io (CDN)",
      badgeText: isVideo ? "ImageKit Video CDN Detectado" : "ImageKit CDN Detectado",
      badgeBg: "bg-emerald-500/10",
      badgeBorder: "border-emerald-500/30",
      badgeTextCol: "text-emerald-400",
      badgeDotCol: "bg-emerald-400",
      description: isVideo
        ? "Video alojado en ImageKit.io. Optimización de entrega CDN y extracción automática de poster activada."
        : "Imagen en ImageKit.io. Formato adaptativo WebP/AVIF y aceleración global CDN habilitados.",
      isSupportedVideo: isVideo,
      isSupportedImage: !isVideo,
    };
  }

  // 4. Cloudinary Detection
  if (isCloudinaryImageUrl(trimmed) || isCloudinaryVideoUrl(trimmed)) {
    const isVideo = isCloudinaryVideoUrl(trimmed);
    return {
      provider: "cloudinary",
      label: isVideo ? "Cloudinary (Video)" : "Cloudinary (CDN)",
      badgeText: isVideo ? "Cloudinary Video Detectado" : "Cloudinary CDN Detectado",
      badgeBg: "bg-purple-500/10",
      badgeBorder: "border-purple-500/30",
      badgeTextCol: "text-purple-400",
      badgeDotCol: "bg-purple-400",
      description: isVideo
        ? "Video en Cloudinary con transcodificación automática f_mp4/q_auto y extracción de fotograma clave."
        : "Imagen en Cloudinary con compresión f_auto/q_auto inteligente sin pérdida de calidad visual.",
      isSupportedVideo: isVideo,
      isSupportedImage: !isVideo,
    };
  }

  // 5. Google Drive Detection
  if (isGoogleDriveUrl(trimmed)) {
    const driveConfig = getDriveMediaConfig(trimmed);
    return {
      provider: "google_drive",
      label: "Google Drive",
      badgeText: "Google Drive Detectado",
      badgeBg: "bg-blue-500/10",
      badgeBorder: "border-blue-500/30",
      badgeTextCol: "text-blue-400",
      badgeDotCol: "bg-blue-400",
      description: driveConfig.fileId
        ? `Archivo ID: ${driveConfig.fileId}. Convertido automáticamente a enlace de streaming directo y reproductor integrado.`
        : "Enlace de Google Drive detectado.",
      isSupportedVideo: true,
      isSupportedImage: true,
      thumbnailUrl: driveConfig.thumbnailUrl,
    };
  }

  // 6. Imgur Detection
  if (isImgurUrl(trimmed)) {
    return {
      provider: "imgur",
      label: "Imgur Media",
      badgeText: "Imgur Detectado",
      badgeBg: "bg-emerald-500/10",
      badgeBorder: "border-emerald-500/30",
      badgeTextCol: "text-emerald-400",
      badgeDotCol: "bg-emerald-400",
      description: "Enlace de Imgur detectado. Enrutamiento directo en alta resolución y preservación de transparencia PNG.",
      isSupportedVideo: trimmed.includes(".mp4") || trimmed.includes(".webm") || trimmed.includes(".gifv"),
      isSupportedImage: true,
    };
  }

  // 7. Direct Video File (.mp4, .webm, .mov, .m4v, .ogv)
  if (/\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i.test(trimmed)) {
    return {
      provider: "direct_video",
      label: "Video Directo",
      badgeText: "Archivo de Video Directo (.mp4/.webm)",
      badgeBg: "bg-emerald-500/10",
      badgeBorder: "border-emerald-500/30",
      badgeTextCol: "text-emerald-400",
      badgeDotCol: "bg-emerald-400",
      description: "Video HTML5 compatible nativo con aceleración por hardware de navegador.",
      isSupportedVideo: true,
      isSupportedImage: false,
    };
  }

  // 8. Direct Image File (.png, .webp, .jpg, .jpeg, .svg, .gif, .avif)
  if (/\.(png|webp|jpe?g|svg|gif|avif)(\?.*)?$/i.test(trimmed)) {
    return {
      provider: "direct_image",
      label: "Imagen Directa",
      badgeText: "Archivo de Imagen Directo",
      badgeBg: "bg-emerald-500/10",
      badgeBorder: "border-emerald-500/30",
      badgeTextCol: "text-emerald-400",
      badgeDotCol: "bg-emerald-400",
      description: "Archivo de imagen directo con optimización de carga diferida.",
      isSupportedVideo: false,
      isSupportedImage: true,
    };
  }

  // 9. Generic URL
  return {
    provider: "unknown",
    label: "Enlace Web",
    badgeText: "Enlace Web Personalizado",
    badgeBg: "bg-neutral-800/60",
    badgeBorder: "border-neutral-700",
    badgeTextCol: "text-neutral-300",
    badgeDotCol: "bg-neutral-400",
    description: "Enlace web estándar. Será cargado mediante los reproductores nativos del sistema.",
    isSupportedVideo: true,
    isSupportedImage: true,
  };
}

// ----------------------------------------------------
// Vimeo Support & Optimization Engine
// ----------------------------------------------------

export interface VimeoMediaConfig {
  isVimeo: boolean;
  videoId: string | null;
  hash: string | null;
  embedUrl: string;
}

export function isVimeoUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim().toLowerCase();
  return (
    trimmed.includes("vimeo.com") ||
    trimmed.includes("player.vimeo.com") ||
    trimmed.includes("vimeocdn.com")
  );
}

export function extractVimeoConfig(url: string | null | undefined): VimeoMediaConfig {
  if (!url || typeof url !== "string") {
    return { isVimeo: false, videoId: null, hash: null, embedUrl: "" };
  }
  const trimmed = url.trim();
  if (!isVimeoUrl(trimmed)) {
    return { isVimeo: false, videoId: null, hash: null, embedUrl: "" };
  }

  // 1. player.vimeo.com/video/VIDEO_ID?h=HASH
  const playerMatch = trimmed.match(/player\.vimeo\.com\/video\/(\d+)(?:[/?](?:[^&]*[?&])?h=([a-zA-Z0-9]+))?/i);
  if (playerMatch && playerMatch[1]) {
    const videoId = playerMatch[1];
    let hash = playerMatch[2] || null;
    if (!hash) {
      const hParam = trimmed.match(/[?&]h=([a-zA-Z0-9]+)/i);
      if (hParam && hParam[1]) hash = hParam[1];
    }
    const embedUrl = hash 
      ? `https://player.vimeo.com/video/${videoId}?h=${hash}`
      : `https://player.vimeo.com/video/${videoId}`;
    return { isVimeo: true, videoId, hash, embedUrl };
  }

  // 2. vimeo.com/VIDEO_ID/HASH (unlisted / private)
  const unlistedMatch = trimmed.match(/vimeo\.com\/(\d+)\/([a-zA-Z0-9]+)/i);
  if (unlistedMatch && unlistedMatch[1] && unlistedMatch[2]) {
    const videoId = unlistedMatch[1];
    const hash = unlistedMatch[2];
    return {
      isVimeo: true,
      videoId,
      hash,
      embedUrl: `https://player.vimeo.com/video/${videoId}?h=${hash}`
    };
  }

  // 3. vimeo.com/VIDEO_ID (or vimeo.com/channels/*/ID or manage/videos/ID or groups/*/videos/ID)
  const stdMatch = trimmed.match(/vimeo\.com\/(?:channels\/(?:[^\/]+\/)?|groups\/[^\/]+\/videos\/|album\/(?:\d+\/)?video\/|manage\/videos\/|video\/)?(\d+)/i);
  if (stdMatch && stdMatch[1]) {
    const videoId = stdMatch[1];
    const hParam = trimmed.match(/[?&]h=([a-zA-Z0-9]+)/i);
    const hash = hParam ? hParam[1] : null;
    const embedUrl = hash
      ? `https://player.vimeo.com/video/${videoId}?h=${hash}`
      : `https://player.vimeo.com/video/${videoId}`;
    return { isVimeo: true, videoId, hash, embedUrl };
  }

  return { isVimeo: true, videoId: null, hash: null, embedUrl: trimmed };
}

export function getVimeoEmbedUrl(
  url: string,
  options?: {
    isHero?: boolean;
    autoplay?: boolean;
    muted?: boolean;
    loop?: boolean;
    controls?: boolean;
  }
): string {
  const config = extractVimeoConfig(url);
  if (!config.isVimeo) return url;

  const base = config.embedUrl;
  const params = new URLSearchParams();

  if (config.hash) {
    params.set("h", config.hash);
  }

  // Vimeo options for clean, premium embedded playback
  params.set("dnt", "1");
  params.set("playsinline", "1");
  params.set("autopause", "0");
  params.set("api", "1");

  if (options?.isHero) {
    // True background hero video mode: hides all chrome, autoplays, loops continuously, muted
    params.set("background", "1");
    params.set("autoplay", "1");
    params.set("loop", "1");
    params.set("muted", "1");
    params.set("byline", "0");
    params.set("title", "0");
  } else {
    if (options?.autoplay) params.set("autoplay", "1");
    if (options?.loop !== false) params.set("loop", "1");
    if (options?.muted) params.set("muted", "1");
    if (options?.controls === false) params.set("controls", "0");
    params.set("title", "0");
    params.set("byline", "0");
    params.set("portrait", "0");
    params.set("badge", "0");
  }

  const queryString = params.toString();
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${queryString}`;
}

// ----------------------------------------------------
// Imgur Support & Optimization Engine
// ----------------------------------------------------

export function isImgurUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim().toLowerCase();
  return trimmed.includes("imgur.com");
}

export function isImgurVideoUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  if (!isImgurUrl(url)) return false;
  return (
    /\.(mp4|gifv|webm)(\?.*)?$/i.test(url.trim()) ||
    url.trim().endsWith("/gifv")
  );
}

export function getDirectImgurUrl(
  url: string | null | undefined,
  targetWidth: number = 600,
  options?: { preserveTransparency?: boolean }
): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!isImgurUrl(trimmed)) return trimmed;

  try {
    // 1. If it's a gifv, convert to direct mp4 video
    if (trimmed.includes(".gifv")) {
      return trimmed.replace(".gifv", ".mp4");
    }

    // 2. Extract Imgur Image ID
    // Matches patterns like:
    // https://i.imgur.com/8QzX9Yr.png
    // https://imgur.com/8QzX9Yr
    // https://imgur.com/a/8QzX9Yr (album URL pasted by user)
    // https://imgur.com/gallery/8QzX9Yr
    const match = trimmed.match(/(?:imgur\.com\/(?:a\/|gallery\/)?|i\.imgur\.com\/)([a-zA-Z0-9]+)(?:\.([a-zA-Z0-9]+))?/i);
    if (!match || !match[1]) return trimmed;

    const imgId = match[1];
    const isPng = options?.preserveTransparency || isPngUrl(trimmed);
    let ext = match[2] ? match[2].toLowerCase() : (isPng ? "png" : "png");
    if (ext === "gifv") ext = "mp4";

    // If it's a PNG or transparency is requested, preserve PNG directly to maintain alpha transparency for caps and logos
    if (ext === "png" || isPng) {
      return `https://i.imgur.com/${imgId}.png`;
    }

    // If it's a video file (.mp4 or .webm)
    if (ext === "mp4" || ext === "webm") {
      return `https://i.imgur.com/${imgId}.${ext}`;
    }

    // For standard images, pick the optimal Imgur CDN sizing suffix:
    // s: 90x90, b: 160x160, m: 320x320, l: 640x640, h: 1024x1024
    let suffix = "";
    if (targetWidth <= 160) {
      suffix = "b";
    } else if (targetWidth <= 320) {
      suffix = "m";
    } else if (targetWidth <= 640) {
      suffix = "l";
    } else if (targetWidth <= 1024) {
      suffix = "h";
    }

    return `https://i.imgur.com/${imgId}${suffix}.${ext}`;
  } catch {
    return trimmed;
  }
}
