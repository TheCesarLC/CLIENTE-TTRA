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

  useEffect(() => {
    let isMounted = true;
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

    // Set temporary optimized URL while processing transparency
    setDisplaySrc(optimized);

    // Process transparent cutout in background
    removeWhiteBackground(optimized)
      .then((transparentUrl) => {
        if (isMounted && transparentUrl) {
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
  }, [src, widthOptimization]);

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
      onError={() => {
        setIsLoaded(true);
        onError?.();
      }}
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
