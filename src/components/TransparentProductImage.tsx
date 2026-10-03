import React, { useState, useEffect } from "react";
import { getCachedTransparentImage } from "../lib/transparentBg";
import { getOptimizedImageUrl, getRawFallbackImageUrl } from "../lib/imageOptimizer";

interface TransparentProductImageProps {
  src: string;
  alt: string;
  className?: string;
  widthOptimization?: number;
  loading?: "eager" | "lazy";
  onLoad?: () => void;
  onError?: () => void;
  shouldGlow?: boolean;
  style?: React.CSSProperties;
}

export const TransparentProductImage: React.FC<TransparentProductImageProps> = ({
  src,
  alt,
  className = "",
  widthOptimization = 800,
  loading = "eager",
  onLoad,
  onError,
  shouldGlow = false,
  style = {},
}) => {
  const initialOptimized = getOptimizedImageUrl(src, widthOptimization);
  const [displaySrc, setDisplaySrc] = useState<string>(() => {
    return getCachedTransparentImage(initialOptimized) || initialOptimized;
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [fallbackStage, setFallbackStage] = useState(0);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setHasFailed(false);
    setFallbackStage(0);
    
    const optimized = getOptimizedImageUrl(src, widthOptimization);
    
    if (!optimized) {
      setDisplaySrc("");
      return;
    }

    const cached = getCachedTransparentImage(optimized);
    if (cached) {
      setDisplaySrc(cached);
      return;
    }

    // Instant rendering with high-speed compressed URL
    setDisplaySrc(optimized);
  }, [src, widthOptimization]);

  const handleImageError = () => {
    const rawFallback = getRawFallbackImageUrl(src);

    // Stage 1: Try direct raw image URL (e.g. https://i.imgur.com/ID.webp or https://i.ibb.co/...)
    if (fallbackStage === 0 && rawFallback && rawFallback !== displaySrc) {
      setFallbackStage(1);
      setDisplaySrc(rawFallback);
      return;
    }

    // Stage 2: Try backend proxy
    if (
      fallbackStage <= 1 &&
      rawFallback &&
      !rawFallback.startsWith("data:") &&
      !rawFallback.startsWith("/api/proxy-image")
    ) {
      setFallbackStage(2);
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(rawFallback)}&w=${widthOptimization}&fmt=webp`;
      setDisplaySrc(proxyUrl);
      return;
    }

    // Stage 3: Suppress broken question mark icon
    setHasFailed(true);
    setIsLoaded(true);
    onError?.();
  };

  if (hasFailed) {
    return (
      <div
        className={`${className} flex flex-col items-center justify-center bg-white/[0.02] border border-white/10 rounded-lg p-2 text-center select-none`}
        style={{
          backgroundColor: "transparent",
          ...style,
        }}
      >
        <span className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">
          TETRA
        </span>
      </div>
    );
  }

  return (
    <img
      src={displaySrc || initialOptimized}
      alt={alt}
      loading={loading}
      decoding="async"
      onLoad={() => {
        setIsLoaded(true);
        onLoad?.();
      }}
      onError={handleImageError}
      className={`${className} ${
        shouldGlow ? "brightness-[1.15] contrast-[1.1] saturate-[1.2]" : ""
      }`}
      style={{
        backgroundColor: "transparent",
        ...style,
      }}
      referrerPolicy="no-referrer"
    />
  );
};

export default TransparentProductImage;
