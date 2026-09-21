import React, { useState, useEffect } from "react";
import { removeBackground, getCachedTransparentImage } from "../lib/transparentBg";
import { getOptimizedImageUrl } from "../lib/imageOptimizer";

interface TransparentLogoProps {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  onError?: () => void;
  onLoad?: () => void;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  id?: string;
}

/**
 * TransparentLogo guarantees that PNG logos display with 100% transparent backgrounds.
 * 1. Preserves original PNG transparency without lossy format conversions.
 * 2. Uses client-side BFS flood-fill background removal to strip any black or dark borders 
 *    in case the image was saved/exported with a black background.
 * 3. Enforces transparent background styling across all device viewports.
 */
export default function TransparentLogo({
  src,
  alt = "TETRA HATS",
  className = "",
  style = {},
  onError,
  onLoad,
  referrerPolicy = "no-referrer",
  id
}: TransparentLogoProps) {
  const [displaySrc, setDisplaySrc] = useState<string>(() => {
    if (!src) return "";
    const optimized = getOptimizedImageUrl(src, 500, { preserveTransparency: true });
    return getCachedTransparentImage(optimized) || getCachedTransparentImage(src) || optimized;
  });

  useEffect(() => {
    let isMounted = true;
    if (!src) {
      setDisplaySrc("");
      return;
    }

    const optimized = getOptimizedImageUrl(src, 500, { preserveTransparency: true });
    const cached = getCachedTransparentImage(optimized) || getCachedTransparentImage(src);
    if (cached) {
      setDisplaySrc(cached);
      return;
    }

    // Set optimized URL as initial display
    setDisplaySrc(optimized);

    // Asynchronously detect and remove any black/dark borders or artifacts
    removeBackground(optimized, { threshold: 55, colorTolerance: 38 })
      .then((transparentUrl) => {
        if (isMounted && transparentUrl && transparentUrl !== optimized) {
          setDisplaySrc(transparentUrl);
        }
      })
      .catch(() => {
        if (isMounted) {
          setDisplaySrc(optimized);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [src]);

  if (!displaySrc) return null;

  return (
    <img
      id={id}
      src={displaySrc}
      alt={alt}
      className={className}
      style={{
        backgroundColor: "transparent",
        color: "transparent",
        ...style
      }}
      referrerPolicy={referrerPolicy}
      onLoad={onLoad}
      onError={onError}
    />
  );
}
