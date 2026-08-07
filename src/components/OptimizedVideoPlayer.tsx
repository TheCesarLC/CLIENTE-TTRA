import React, { useState, useRef } from "react";
import { getDriveMediaConfig } from "../lib/mediaUtils";
import { Volume2, VolumeX, Play, Pause } from "lucide-react";

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
  customOverlayControls?: boolean;
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
  customOverlayControls = true,
}: OptimizedVideoPlayerProps) {
  const [videoError, setVideoError] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  const driveConfig = getDriveMediaConfig(src);

  if (!src) return null;

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const togglePlay = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  // If it's a Google Drive link and video tag threw an error OR if explicitly rendering iframe fallback
  if (driveConfig.isDrive && (videoError || driveConfig.embedUrl)) {
    if (videoError) {
      return (
        <div className="relative w-full h-full overflow-hidden bg-black flex items-center justify-center rounded-xl">
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
    <div className="relative w-full h-full group overflow-hidden select-none">
      <video
        ref={videoRef}
        key={driveConfig.isDrive ? driveConfig.fileId || src : src}
        playsInline={playsInline}
        autoPlay={autoPlay}
        loop={loop}
        muted={isMuted}
        controls={controls}
        className={className}
        poster={poster}
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
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

      {/* Floating minimal overlay buttons so controls never obstruct video content */}
      {customOverlayControls && !controls && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 transition-opacity duration-300">
          {/* Top play/pause indicator */}
          <div className="flex justify-end items-center pointer-events-auto">
            <button
              onClick={toggleMute}
              title={isMuted ? "Activar Sonido" : "Silenciar"}
              className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/10 transition-transform active:scale-95 shadow-lg flex items-center justify-center gap-1.5"
            >
              {isMuted ? (
                <>
                  <VolumeX size={15} className="text-gray-300" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-300 pr-0.5 hidden sm:inline">Sin Sonido</span>
                </>
              ) : (
                <>
                  <Volume2 size={15} className="text-emerald-400" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 pr-0.5 hidden sm:inline">Sonido Activo</span>
                </>
              )}
            </button>
          </div>

          {/* Center Play/Pause Overlay indicator when paused */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] pointer-events-auto cursor-pointer" onClick={togglePlay}>
              <div className="w-12 h-12 rounded-full bg-emerald-500/90 text-black flex items-center justify-center shadow-xl transform transition-transform group-hover:scale-110">
                <Play size={22} className="ml-1 fill-black" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
