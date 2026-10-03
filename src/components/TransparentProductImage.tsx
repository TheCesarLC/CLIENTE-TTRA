import React, { useState, useEffect } from "react";
import { removeWhiteBackground, getCachedTransparentImage } from "../lib/transparentBg";
import { getOptimizedImageUrl } from "../lib/imageOptimizer";

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
  const [hasRetriedProxy, setHasRetriedProxy] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setHasFailed(false);
    setHasRetriedProxy(false);
    
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

    return () => {
      isMounted = false;
    };
  }, [src, widthOptimization]);

  const handleImageError = () => {
    // If the image failed to load and hasn't tried the backend proxy yet, try the proxy
    if (
      !hasRetriedProxy &&
      displaySrc &&
      !displaySrc.startsWith("data:") &&
      !displaySrc.startsWith("/api/proxy-image")
    ) {
      setHasRetriedProxy(true);
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(displaySrc)}&w=${widthOptimization}&fmt=webp`;
      setDisplaySrc(proxyUrl);
      return;
    }

    // If proxy also failed or not applicable, mark as failed to suppress the broken question mark icon
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
