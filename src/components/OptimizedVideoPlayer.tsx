import React, { useState, useRef, useEffect } from "react";
import { getDriveMediaConfig } from "../lib/mediaUtils";
import { Volume2, VolumeX, Play } from "lucide-react";

interface OptimizedVideoPlayerProps {
  id?: string;
  activeVideoId?: string | null;
  onPlayRequest?: (id: string) => void;
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
  id,
  activeVideoId,
  onPlayRequest,
  src,
  poster,
  className = "w-full h-full object-cover",
  controls = false,
  autoPlay = false,
  loop = true,
  muted = true,
  playsInline = true,
  onClick,
  customOverlayControls = true,
}: OptimizedVideoPlayerProps) {
  const [videoError, setVideoError] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const driveConfig = getDriveMediaConfig(src);
  const effectivePoster =
    poster ||
    (driveConfig.isDrive && driveConfig.fileId
      ? `https://drive.google.com/thumbnail?id=${driveConfig.fileId}&sz=w1200`
      : undefined);

  // Sync external activeVideoId state (Mutual exclusion: only 1 video plays at a time)
  useEffect(() => {
    if (id && activeVideoId !== undefined) {
      if (activeVideoId && activeVideoId === id) {
        if (videoRef.current && videoRef.current.paused) {
          videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      } else {
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      }
    }
  }, [activeVideoId, id]);

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
        if (id && onPlayRequest && activeVideoId === id) {
          onPlayRequest(null);
        }
      } else {
        // Pause any other playing HTML5 videos on the page immediately
        document.querySelectorAll("video").forEach((v) => {
          if (v !== videoRef.current) {
            v.pause();
          }
        });
        
        videoRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            if (id && onPlayRequest) {
              onPlayRequest(id);
            }
          })
          .catch(() => {});
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
    }
  };

  // If it's a Google Drive link and HTML5 video tag failed, render controlled iframe fallback
  if (driveConfig.isDrive && videoError) {
    const isThisActive = id && activeVideoId === id;
    return (
      <div 
        className="relative w-full h-full overflow-hidden bg-black flex items-center justify-center rounded-2xl select-none group cursor-pointer"
        onClick={() => {
          if (id && onPlayRequest) {
            onPlayRequest(isThisActive ? "" : id);
          }
        }}
      >
        {isThisActive ? (
          <iframe
            src={`${driveConfig.embedUrl}?autoplay=1`}
            className="w-full h-full border-0 pointer-events-auto scale-[1.02]"
            allow="autoplay; encrypted-media"
            allowFullScreen
            title="Google Drive Video Player"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-neutral-950 relative overflow-hidden">
            {effectivePoster && (
              <img 
                src={effectivePoster} 
                alt="Vista Previa" 
                className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
            )}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
            <div className="w-16 h-16 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-2xl z-10 transition-transform group-hover:scale-110 active:scale-95">
              <Play size={28} className="ml-1 fill-black" />
            </div>
            <span className="mt-3 text-xs font-black uppercase tracking-widest text-emerald-400 z-10 bg-black/70 px-3.5 py-1.5 rounded-full backdrop-blur-md border border-emerald-500/30 shadow-lg">
              Reproducir Video
            </span>
          </div>
        )}
      </div>
    );
  }

  // Standard or Google Drive Direct HTML5 Video (Sleek, Non-Intrusive)
  return (
    <div 
      className="relative w-full h-full group overflow-hidden select-none cursor-pointer rounded-2xl bg-black"
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        key={driveConfig.isDrive ? driveConfig.fileId || src : src}
        playsInline={playsInline}
        preload="metadata"
        referrerPolicy="no-referrer"
        loop={loop}
        muted={isMuted}
        controls={controls}
        className={className}
        poster={effectivePoster}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => {
          document.querySelectorAll("video").forEach((v) => {
            if (v !== videoRef.current) {
              v.pause();
            }
          });
          setIsPlaying(true);
          if (id && onPlayRequest && activeVideoId !== id) {
            onPlayRequest(id);
          }
        }}
        onPause={() => setIsPlaying(false)}
        onError={() => {
          if (driveConfig.isDrive) {
            setVideoError(true);
          }
        }}
      >
        {driveConfig.isDrive ? (
          <>
            <source src={`https://lh3.googleusercontent.com/d/${driveConfig.fileId}=m22`} type="video/mp4" />
            <source src={`https://lh3.googleusercontent.com/d/${driveConfig.fileId}=m18`} type="video/mp4" />
            <source src={`https://drive.google.com/uc?export=download&id=${driveConfig.fileId}`} type="video/mp4" />
            <source src={`https://lh3.googleusercontent.com/d/${driveConfig.fileId}`} type="video/mp4" />
          </>
        ) : (
          <source src={src} />
        )}
        Tu navegador no soporta reproducción de video HTML5.
      </video>

      {/* Poster / Thumbnail Overlay when not playing so video never appears pitch black */}
      {!isPlaying && effectivePoster && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <img
            src={effectivePoster}
            alt="Vista previa video"
            className="w-full h-full object-cover brightness-[0.95] contrast-[1.05] group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-black/20" />
        </div>
      )}

      {/* Modern, minimalist floating overlay (Never blocks the video content) */}
      {customOverlayControls && !controls && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3.5 transition-opacity duration-300">
          {/* Top Sound Toggle Badge */}
          <div className="flex justify-end items-center pointer-events-auto">
            <button
              onClick={toggleMute}
              title={isMuted ? "Activar Sonido" : "Silenciar"}
              className="px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/15 transition-all active:scale-95 shadow-xl flex items-center gap-1.5"
            >
              {isMuted ? (
                <>
                  <VolumeX size={14} className="text-gray-300" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">Sin Sonido</span>
                </>
              ) : (
                <>
                  <Volume2 size={14} className="text-emerald-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Sonido Activo</span>
                </>
              )}
            </button>
          </div>

          {/* Center Play Button Overlay (Visible ONLY when paused so it NEVER obstructs video while playing) */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[1px] pointer-events-none">
              <div className="w-14 h-14 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-2xl transform transition-transform group-hover:scale-110 active:scale-95">
                <Play size={26} className="ml-1 fill-black" />
              </div>
            </div>
          )}

          {/* Subtle 2px bottom progress bar line (Extremely clean, non-obtrusive) */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40 overflow-hidden pointer-events-none">
            <div
              className="h-full bg-emerald-400 transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

