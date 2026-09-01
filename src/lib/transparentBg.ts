// Utility to automatically detect and remove white / light backgrounds from product images
// Preserves internal white logos, text, and embroidery by only flood-filling from outer boundaries.

const transparentCache = new Map<string, string>();
const pendingPromises = new Map<string, Promise<string>>();

interface RemoveBgOptions {
  threshold?: number; // Brightness threshold (0-255), default 220
  colorTolerance?: number; // Max difference between R, G, B channels (neutral color check), default 35
  feather?: number; // Softness radius around edges, default 2
}

/**
 * Checks if a pixel is near-white or light neutral background
 */
function isLightBackgroundPixel(
  r: number,
  g: number,
  b: number,
  threshold: number,
  colorTolerance: number
): boolean {
  // Check if pixel is sufficiently bright
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  if (brightness < threshold) return false;

  // Check if it's neutral (not saturated bright yellow/cyan/etc)
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (max - min) <= colorTolerance;
}

/**
 * Removes solid white/off-white background starting from the edges using BFS Flood Fill
 */
export async function removeWhiteBackground(
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
    threshold = 210,
    colorTolerance = 40,
  } = options;

  const promise = new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

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
        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        const data = imgData.data;

        // Sample 4 corners to verify if image actually has a light background
        const cornerCoords = [
          [0, 0],
          [targetW - 1, 0],
          [0, targetH - 1],
          [targetW - 1, targetH - 1],
          [Math.floor(targetW / 2), 0],
          [Math.floor(targetW / 2), targetH - 1],
          [0, Math.floor(targetH / 2)],
          [targetW - 1, Math.floor(targetH / 2)],
        ];

        let lightBorderSampleCount = 0;
        for (const [cx, cy] of cornerCoords) {
          const idx = (cy * targetW + cx) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];

          // If already transparent, or light colored
          if (a < 50 || isLightBackgroundPixel(r, g, b, threshold - 15, colorTolerance + 10)) {
            lightBorderSampleCount++;
          }
        }

        // If corners are mostly dark or not white background, don't alter the image
        if (lightBorderSampleCount < 3) {
          transparentCache.set(trimmed, trimmed);
          resolve(trimmed);
          return;
        }

        // Flood Fill BFS starting from all 4 borders
        const totalPixels = targetW * targetH;
        const visited = new Uint8Array(totalPixels);
        const queue: number[] = [];

        // Add all 4 outer border pixels to queue
        for (let x = 0; x < targetW; x++) {
          queue.push(0 * targetW + x); // Top edge
          queue.push((targetH - 1) * targetW + x); // Bottom edge
          visited[0 * targetW + x] = 1;
          visited[(targetH - 1) * targetW + x] = 1;
        }
        for (let y = 1; y < targetH - 1; y++) {
          queue.push(y * targetW + 0); // Left edge
          queue.push(y * targetW + (targetW - 1)); // Right edge
          visited[y * targetW + 0] = 1;
          visited[y * targetW + (targetW - 1)] = 1;
        }

        let head = 0;
        const bgIndices: number[] = [];

        while (head < queue.length) {
          const pIdx = queue[head++];
          const px = pIdx % targetW;
          const py = Math.floor(pIdx / targetW);
          const dIdx = pIdx * 4;

          const r = data[dIdx];
          const g = data[dIdx + 1];
          const b = data[dIdx + 2];
          const a = data[dIdx + 3];

          // If transparent already or matches light background
          if (a === 0 || isLightBackgroundPixel(r, g, b, threshold, colorTolerance)) {
            bgIndices.push(pIdx);

            // Check 4 neighbors
            const neighbors = [
              px > 0 ? pIdx - 1 : -1,
              px < targetW - 1 ? pIdx + 1 : -1,
              py > 0 ? pIdx - targetW : -1,
              py < targetH - 1 ? pIdx + targetW : -1,
            ];

            for (const nIdx of neighbors) {
              if (nIdx !== -1 && visited[nIdx] === 0) {
                visited[nIdx] = 1;
                queue.push(nIdx);
              }
            }
          }
        }

        // Apply transparency and anti-aliasing to identified background pixels
        for (const pIdx of bgIndices) {
          const dIdx = pIdx * 4;
          const r = data[dIdx];
          const g = data[dIdx + 1];
          const b = data[dIdx + 2];
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;

          if (brightness >= threshold + 10) {
            // Pure white background -> fully transparent
            data[dIdx + 3] = 0;
          } else {
            // Edge transition -> smooth feathering
            const factor = Math.max(0, Math.min(1, (threshold + 10 - brightness) / 25));
            data[dIdx + 3] = Math.round(factor * 255);
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const resultDataUrl = canvas.toDataURL("image/png");
        transparentCache.set(trimmed, resultDataUrl);
        resolve(resultDataUrl);
      } catch (err) {
        // If direct canvas fails (e.g. CORS restriction), try through our local image proxy
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
                const pImgData = pCtx.getImageData(0, 0, pW, pH);
                const pData = pImgData.data;

                // Process BFS Flood Fill
                const total = pW * pH;
                const vis = new Uint8Array(total);
                const q: number[] = [];

                for (let x = 0; x < pW; x++) {
                  q.push(0 * pW + x);
                  q.push((pH - 1) * pW + x);
                  vis[0 * pW + x] = 1;
                  vis[(pH - 1) * pW + x] = 1;
                }
                for (let y = 1; y < pH - 1; y++) {
                  q.push(y * pW + 0);
                  q.push(y * pW + (pW - 1));
                  vis[y * pW + 0] = 1;
                  vis[y * pW + (pW - 1)] = 1;
                }

                let h = 0;
                while (h < q.length) {
                  const pI = q[h++];
                  const px = pI % pW;
                  const py = Math.floor(pI / pW);
                  const dI = pI * 4;
                  const r = pData[dI];
                  const g = pData[dI + 1];
                  const b = pData[dI + 2];
                  const a = pData[dI + 3];

                  if (a === 0 || isLightBackgroundPixel(r, g, b, threshold, colorTolerance)) {
                    pData[dI + 3] = 0;
                    const nbs = [
                      px > 0 ? pI - 1 : -1,
                      px < pW - 1 ? pI + 1 : -1,
                      py > 0 ? pI - pW : -1,
                      py < pH - 1 ? pI + pW : -1,
                    ];
                    for (const n of nbs) {
                      if (n !== -1 && vis[n] === 0) {
                        vis[n] = 1;
                        q.push(n);
                      }
                    }
                  }
                }
                pCtx.putImageData(pImgData, 0, 0);
                const pDataUrl = pCanvas.toDataURL("image/png");
                transparentCache.set(trimmed, pDataUrl);
                resolve(pDataUrl);
                return;
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

        // Fallback to original image URL
        transparentCache.set(trimmed, trimmed);
        resolve(trimmed);
      } finally {
        pendingPromises.delete(trimmed);
      }
    };

    img.onerror = () => {
      pendingPromises.delete(trimmed);
      transparentCache.set(trimmed, trimmed);
      resolve(trimmed);
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
