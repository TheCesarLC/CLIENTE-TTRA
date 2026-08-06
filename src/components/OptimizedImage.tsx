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

  const optimizedSrc = getOptimizedImageUrl(src, targetWidth);

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
        src={optimizedSrc}
        alt={alt}
        loading={loading}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setIsLoaded(true);
          setHasError(true);
        }}
        className={`transition-opacity duration-500 ${
          isLoaded ? "opacity-100" : "opacity-0"
        } ${className}`}
        {...props}
      />
    </div>
  );
};
