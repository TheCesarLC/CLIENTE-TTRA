import React, { useState, useEffect } from "react";
import { getCachedTransparentImage } from "../lib/transparentBg";
import { getOptimizedImageUrl, getRawFallbackImageUrl } from "../lib/imageOptimizer";

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
 * TransparentLogo guarantees that PNG/WebP logos display with 100% transparent backgrounds
 * and automatic multi-stage fallback across all viewports.
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
  const [fallbackStage, setFallbackStage] = useState(0);
  const [hasFailed, setHasFailed] = useState(false);
  const [displaySrc, setDisplaySrc] = useState<string>(() => {
    if (!src) return "";
    const optimized = getOptimizedImageUrl(src, 500, { preserveTransparency: true });
    return getCachedTransparentImage(optimized) || getCachedTransparentImage(src) || optimized;
  });

  useEffect(() => {
    setFallbackStage(0);
    setHasFailed(false);
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

    setDisplaySrc(optimized);
  }, [src]);

  if (!displaySrc || hasFailed) return null;

  const handleLogoError = () => {
    const rawFallback = getRawFallbackImageUrl(src);
    if (fallbackStage === 0 && rawFallback && rawFallback !== displaySrc) {
      setFallbackStage(1);
      setDisplaySrc(rawFallback);
      return;
    }
    if (
      fallbackStage <= 1 &&
      rawFallback &&
      !rawFallback.startsWith("data:") &&
      !rawFallback.startsWith("/api/proxy-image")
    ) {
      setFallbackStage(2);
      setDisplaySrc(`/api/proxy-image?url=${encodeURIComponent(rawFallback)}`);
      return;
    }
    setHasFailed(true);
    onError?.();
  };

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
      onError={handleLogoError}
    />
  );
}
