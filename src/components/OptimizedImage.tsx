import React, { useState } from "react";
import { getOptimizedImageUrl, getRawFallbackImageUrl } from "../lib/imageOptimizer";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  targetWidth?: number;
  className?: string;
  containerClassName?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  targetWidth = 800,
  className = "",
  containerClassName = "",
  loading = "lazy",
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [fallbackStage, setFallbackStage] = useState(0);

  const optimizedSrc = getOptimizedImageUrl(src, targetWidth);
  const [currentSrc, setCurrentSrc] = useState(optimizedSrc);

  React.useEffect(() => {
    setCurrentSrc(getOptimizedImageUrl(src, targetWidth));
    setHasError(false);
    setFallbackStage(0);
  }, [src, targetWidth]);

  const handleError = () => {
    const rawFallback = getRawFallbackImageUrl(src);
    if (fallbackStage === 0 && rawFallback && rawFallback !== currentSrc) {
      setFallbackStage(1);
      setCurrentSrc(rawFallback);
      return;
    }
    if (
      fallbackStage <= 1 &&
      rawFallback &&
      !rawFallback.startsWith("data:") &&
      !rawFallback.startsWith("/api/proxy-image")
    ) {
      setFallbackStage(2);
      setCurrentSrc(`/api/proxy-image?url=${encodeURIComponent(rawFallback)}`);
      return;
    }
    setIsLoaded(true);
    setHasError(true);
  };

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      {/* Dark Shimmer Loading Placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-neutral-900 animate-pulse flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Actual Image */}
      <img
        src={currentSrc}
        alt={alt}
        loading={loading}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoaded(true)}
        onError={handleError}
        className={`transition-opacity duration-500 ${
          isLoaded && !hasError ? "opacity-100" : "opacity-0"
        } ${className}`}
        {...props}
      />
    </div>
  );
};
