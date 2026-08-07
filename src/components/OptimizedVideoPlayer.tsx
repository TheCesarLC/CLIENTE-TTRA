import React, { useState } from "react";
import { getDriveMediaConfig } from "../lib/mediaUtils";

interface OptimizedVideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  onClick?: () => void;
}

export default function OptimizedVideoPlayer({
  src,
  poster,
  className = "w-full h-full object-cover",
  controls = false,
  autoPlay = true,
  loop = true,
  muted = true,
  playsInline = true,
  onClick,
}: OptimizedVideoPlayerProps) {
  const [videoError, setVideoError] = useState(false);
  const driveConfig = getDriveMediaConfig(src);

  if (!src) return null;

  // If it's a Google Drive link and video tag threw an error OR if explicitly rendering iframe fallback
  if (driveConfig.isDrive && (videoError || driveConfig.embedUrl)) {
    // If video tag had an error, render Google Drive embedded preview player in iframe
    if (videoError) {
      return (
        <div className="relative w-full h-full overflow-hidden bg-black flex items-center justify-center">
          <iframe
            src={`${driveConfig.embedUrl}`}
            className="w-full h-full border-0 pointer-events-auto"
            allow="autoplay; encrypted-media"
            allowFullScreen
            title="Google Drive Video Player"
          />
        </div>
      );
    }
  }

  // Standard or Google Drive Direct HTML5 Video
  return (
    <video
      key={driveConfig.isDrive ? driveConfig.fileId || src : src}
      playsInline={playsInline}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      controls={controls}
      className={className}
      poster={poster}
      onClick={onClick}
      onError={() => {
        if (driveConfig.isDrive) {
          setVideoError(true);
        }
      }}
    >
      {driveConfig.isDrive ? (
        <>
          <source src={driveConfig.directUrl} type="video/mp4" />
          <source src={driveConfig.streamUrl} type="video/mp4" />
        </>
      ) : (
        <source src={src} />
      )}
      Tu navegador no soporta reproducción de video HTML5.
    </video>
  );
}
