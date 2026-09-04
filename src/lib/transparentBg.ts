// Utility to automatically detect and remove black, dark, white, or light solid backgrounds from product images
// Preserves internal graphics, text, and embroidery by flood-filling from outer boundaries inward with anti-aliasing.

const transparentCache = new Map<string, string>();
const pendingPromises = new Map<string, Promise<string>>();

interface RemoveBgOptions {
  threshold?: number; // Custom threshold if specified
  colorTolerance?: number;
}

/**
 * Checks if a pixel is near-white or light neutral background
 */
function isLightBackgroundPixel(
  r: number,
  g: number,
  b: number,
  threshold: number = 205,
  colorTolerance: number = 40
): boolean {
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  if (brightness < threshold) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (max - min) <= colorTolerance;
}

/**
 * Checks if a pixel is black or dark neutral background
 */
function isDarkBackgroundPixel(
  r: number,
  g: number,
  b: number,
  threshold: number = 42,
  colorTolerance: number = 32
): boolean {
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  if (brightness > threshold) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (max - min) <= colorTolerance;
}

/**
 * Removes solid black/dark or white/light background starting from the edges using BFS Flood Fill
 */
export async function removeWhiteBackground(
  imageUrl: string,
  options: RemoveBgOptions = {}
): Promise<string> {
  return removeBackground(imageUrl, options);
}

export async function removeBackground(
  imageUrl: string,
  options: RemoveBgOptions = {}
): Promise<string> {
  if (!imageUrl || typeof imageUrl !== "string") return imageUrl;
  
  const trimmed = imageUrl.trim();
  if (!trimmed) return "";

  // Check cache first
  if (transparentCache.has(trimmed)) {
    return transparentCache.get(trimmed)!;
  }

  // If already processing this image, return the existing promise
  if (pendingPromises.has(trimmed)) {
    return pendingPromises.get(trimmed)!;
  }

  const {
    threshold,
    colorTolerance = 35,
  } = options;

  const processCanvasData = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ): string | null => {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Sample 16 points along the outer perimeter (corners, midpoints, quarter points)
    const samplePoints = [
      [0, 0],
      [w - 1, 0],
      [0, h - 1],
      [w - 1, h - 1],
      [Math.floor(w / 2), 0],
      [Math.floor(w / 2), h - 1],
      [0, Math.floor(h / 2)],
      [w - 1, Math.floor(h / 2)],
      [Math.floor(w / 4), 0],
      [Math.floor((3 * w) / 4), 0],
      [Math.floor(w / 4), h - 1],
      [Math.floor((3 * w) / 4), h - 1],
      [0, Math.floor(h / 4)],
      [0, Math.floor((3 * h) / 4)],
      [w - 1, Math.floor(h / 4)],
      [w - 1, Math.floor((3 * h) / 4)],
    ];

    let darkBorderCount = 0;
    let lightBorderCount = 0;
    let transparentCount = 0;
    let sumDarkR = 0, sumDarkG = 0, sumDarkB = 0;
    let sumLightR = 0, sumLightG = 0, sumLightB = 0;

    for (const [cx, cy] of samplePoints) {
      const idx = (cy * w + cx) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a < 35) {
        transparentCount++;
        continue;
      }

      if (isDarkBackgroundPixel(r, g, b, 50, colorTolerance + 10)) {
        darkBorderCount++;
        sumDarkR += r;
        sumDarkG += g;
        sumDarkB += b;
      } else if (isLightBackgroundPixel(r, g, b, 190, colorTolerance + 15)) {
        lightBorderCount++;
        sumLightR += r;
        sumLightG += g;
        sumLightB += b;
      }
    }

    // If image is already largely transparent, don't modify
    if (transparentCount >= 8) {
      return null;
    }

    // Determine background type
    const isDarkBg = darkBorderCount >= 4 || (darkBorderCount >= 2 && lightBorderCount === 0);
    const isLightBg = !isDarkBg && (lightBorderCount >= 4 || (lightBorderCount >= 2 && darkBorderCount === 0));

    if (!isDarkBg && !isLightBg) {
      // Neither solid black nor solid white detected on outer edges
      return null;
    }

    const avgR = isDarkBg 
      ? (darkBorderCount > 0 ? sumDarkR / darkBorderCount : 0)
      : (lightBorderCount > 0 ? sumLightR / lightBorderCount : 255);
    const avgG = isDarkBg 
      ? (darkBorderCount > 0 ? sumDarkG / darkBorderCount : 0)
      : (lightBorderCount > 0 ? sumLightG / lightBorderCount : 255);
    const avgB = isDarkBg 
      ? (darkBorderCount > 0 ? sumDarkB / darkBorderCount : 0)
      : (lightBorderCount > 0 ? sumLightB / lightBorderCount : 255);

    const darkThreshold = threshold ?? 45;
    const lightThreshold = threshold ?? 205;

    // Flood Fill BFS starting from all 4 borders inward
    const totalPixels = w * h;
    const visited = new Uint8Array(totalPixels);
    const queue: number[] = [];

    // Add all perimeter pixels to initial queue
    for (let x = 0; x < w; x++) {
      queue.push(x); // Top edge: 0 * w + x
      queue.push((h - 1) * w + x); // Bottom edge
      visited[x] = 1;
      visited[(h - 1) * w + x] = 1;
    }
    for (let y = 1; y < h - 1; y++) {
      queue.push(y * w); // Left edge
      queue.push(y * w + (w - 1)); // Right edge
      visited[y * w] = 1;
      visited[y * w + (w - 1)] = 1;
    }

    let head = 0;
    const bgIndices: number[] = [];

    const isMatchBg = (r: number, g: number, b: number, a: number): boolean => {
      if (a < 35) return true;
      if (isDarkBg) {
        if (isDarkBackgroundPixel(r, g, b, darkThreshold, colorTolerance)) return true;
        const diff = Math.max(Math.abs(r - avgR), Math.abs(g - avgG), Math.abs(b - avgB));
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return diff <= 35 && brightness <= darkThreshold + 12;
      } else {
        if (isLightBackgroundPixel(r, g, b, lightThreshold, colorTolerance)) return true;
        const diff = Math.max(Math.abs(r - avgR), Math.abs(g - avgG), Math.abs(b - avgB));
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return diff <= 40 && brightness >= lightThreshold - 15;
      }
    };

    while (head < queue.length) {
      const pIdx = queue[head++];
      const px = pIdx % w;
      const py = Math.floor(pIdx / w);
      const dIdx = pIdx * 4;

      const r = data[dIdx];
      const g = data[dIdx + 1];
      const b = data[dIdx + 2];
      const a = data[dIdx + 3];

      if (isMatchBg(r, g, b, a)) {
        bgIndices.push(pIdx);

        // Check 4 adjacent neighbors
        if (px > 0 && visited[pIdx - 1] === 0) {
          visited[pIdx - 1] = 1;
          queue.push(pIdx - 1);
        }
        if (px < w - 1 && visited[pIdx + 1] === 0) {
          visited[pIdx + 1] = 1;
          queue.push(pIdx + 1);
        }
        if (py > 0 && visited[pIdx - w] === 0) {
          visited[pIdx - w] = 1;
          queue.push(pIdx - w);
        }
        if (py < h - 1 && visited[pIdx + w] === 0) {
          visited[pIdx + w] = 1;
          queue.push(pIdx + w);
        }
      }
    }

    // Apply transparency and smooth anti-aliased edge feathering
    for (const pIdx of bgIndices) {
      const dIdx = pIdx * 4;
      const r = data[dIdx];
      const g = data[dIdx + 1];
      const b = data[dIdx + 2];
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;

      if (isDarkBg) {
        if (brightness <= 15) {
          data[dIdx + 3] = 0; // Pure black background -> 100% transparent
        } else {
          // Smooth edge feathering for dark transitions
          const factor = Math.max(0, Math.min(1, (brightness - 15) / 28));
          data[dIdx + 3] = Math.round(factor * 255);
        }
      } else {
        if (brightness >= lightThreshold + 10) {
          data[dIdx + 3] = 0; // Pure white background -> 100% transparent
        } else {
          // Smooth edge feathering for light transitions
          const factor = Math.max(0, Math.min(1, (lightThreshold + 10 - brightness) / 25));
          data[dIdx + 3] = Math.round(factor * 255);
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return ctx.canvas.toDataURL("image/png");
  };

  const promise = new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    const tryProxyFallback = () => {
      if (!trimmed.startsWith("data:") && !trimmed.startsWith("/api/proxy-image")) {
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(trimmed)}`;
        const proxyImg = new Image();
        proxyImg.crossOrigin = "anonymous";
        proxyImg.onload = () => {
          try {
            const pW = proxyImg.naturalWidth || proxyImg.width;
            const pH = proxyImg.naturalHeight || proxyImg.height;
            const pCanvas = document.createElement("canvas");
            pCanvas.width = pW;
            pCanvas.height = pH;
            const pCtx = pCanvas.getContext("2d", { willReadFrequently: true });
            if (pCtx) {
              pCtx.drawImage(proxyImg, 0, 0, pW, pH);
              const processed = processCanvasData(pCtx, pW, pH);
              if (processed) {
                transparentCache.set(trimmed, processed);
                resolve(processed);
                return;
              }
            }
          } catch {}
          transparentCache.set(trimmed, trimmed);
          resolve(trimmed);
        };
        proxyImg.onerror = () => {
          transparentCache.set(trimmed, trimmed);
          resolve(trimmed);
        };
        proxyImg.src = proxyUrl;
        return;
      }
      transparentCache.set(trimmed, trimmed);
      resolve(trimmed);
    };

    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        if (width === 0 || height === 0) {
          resolve(trimmed);
          return;
        }

        // Limit canvas dimensions for performance while maintaining sharp quality
        const maxDim = 1200;
        let targetW = width;
        let targetH = height;
        if (targetW > maxDim || targetH > maxDim) {
          if (targetW > targetH) {
            targetH = Math.round((targetH * maxDim) / targetW);
            targetW = maxDim;
          } else {
            targetW = Math.round((targetW * maxDim) / targetH);
            targetH = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        if (!ctx) {
          resolve(trimmed);
          return;
        }

        ctx.drawImage(img, 0, 0, targetW, targetH);
        const resultDataUrl = processCanvasData(ctx, targetW, targetH);

        if (resultDataUrl) {
          transparentCache.set(trimmed, resultDataUrl);
          resolve(resultDataUrl);
          return;
        }

        // If not altered, cache trimmed
        transparentCache.set(trimmed, trimmed);
        resolve(trimmed);
      } catch (err) {
        // Direct canvas threw a security/CORS error -> fallback to proxy
        tryProxyFallback();
      } finally {
        pendingPromises.delete(trimmed);
      }
    };

    img.onerror = () => {
      tryProxyFallback();
    };

    img.src = trimmed;
  });

  pendingPromises.set(trimmed, promise);
  return promise;
}

/**
 * Synchronous cache lookup helper
 */
export function getCachedTransparentImage(url: string): string | null {
  if (!url) return null;
  return transparentCache.get(url.trim()) || null;
}
