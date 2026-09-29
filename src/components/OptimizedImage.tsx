import React, { useState } from "react";
import { getOptimizedImageUrl } from "../lib/imageOptimizer";

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
  const [retriedProxy, setRetriedProxy] = useState(false);

  const optimizedSrc = getOptimizedImageUrl(src, targetWidth);
  const [currentSrc, setCurrentSrc] = useState(optimizedSrc);

  React.useEffect(() => {
    setCurrentSrc(getOptimizedImageUrl(src, targetWidth));
    setHasError(false);
    setRetriedProxy(false);
  }, [src, targetWidth]);

  const handleError = () => {
    if (
      !retriedProxy &&
      currentSrc &&
      !currentSrc.startsWith("data:") &&
      !currentSrc.startsWith("/api/proxy-image")
    ) {
      setRetriedProxy(true);
      setCurrentSrc(`/api/proxy-image?url=${encodeURIComponent(currentSrc)}`);
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
