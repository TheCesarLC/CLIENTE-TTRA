import React, { useState, useRef, useEffect } from "react";
import { getDriveMediaConfig } from "../lib/mediaUtils";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

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

  // Continuous background autoPlay Optimization
  useEffect(() => {
    if ((autoPlay || !customOverlayControls) && videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.volume = 0;
      setIsMuted(true);
      const attemptPlay = () => {
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.volume = 0;
          videoRef.current
            .play()
            .then(() => setIsPlaying(true))
            .catch(() => {
              // User gesture fallback if iOS/browser policy blocks un-triggered autoplay
              const unlockAutoplay = () => {
                if (videoRef.current) {
                  videoRef.current.muted = true;
                  videoRef.current.volume = 0;
                  videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
                }
                window.removeEventListener("touchstart", unlockAutoplay);
                window.removeEventListener("click", unlockAutoplay);
              };
              window.addEventListener("touchstart", unlockAutoplay, { once: true });
              window.addEventListener("click", unlockAutoplay, { once: true });
            });
        }
      };
      attemptPlay();
    }
  }, [autoPlay, customOverlayControls, src]);

  if (!src) return null;

  const [showTapIndicator, setShowTapIndicator] = useState(false);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      if (!nextMuted) {
        videoRef.current.volume = 1;
      }
      setIsMuted(nextMuted);
    }
  };

  const togglePlay = () => {
    if (onClick) {
      onClick();
      return;
    }

    // Brief tap feedback indicator
    setShowTapIndicator(true);
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => {
      setShowTapIndicator(false);
    }, 1200);

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
      // Continuous instant loop: if close to end (0.2s remaining), restart immediately
      if (loop && videoRef.current.currentTime >= videoRef.current.duration - 0.2) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    }
  };

  // If Google Drive link failed to stream directly in HTML5 video, render clean iframe as fallback
  if (driveConfig.isDrive && videoError) {
    const isThisActive = id ? activeVideoId === id : false;
    return (
      <div 
        className="relative w-full h-full overflow-hidden bg-black flex items-center justify-center select-none cursor-pointer group"
        onClick={() => {
          if (id && onPlayRequest) {
            onPlayRequest(isThisActive ? "" : id);
          }
        }}
      >
        {isThisActive || autoPlay ? (
          <iframe
            src={`${driveConfig.embedUrl}?autoplay=1&muted=${autoPlay ? 1 : 0}`}
            className="w-full h-full border-0 object-cover"
            allow="autoplay; encrypted-media"
            allowFullScreen
            title="Video Player"
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
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
            <div className="w-14 h-14 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-2xl z-10 transition-transform group-hover:scale-110 active:scale-95 border border-emerald-400/40">
              <Play size={24} className="ml-0.5 fill-black" />
            </div>
            <span className="mt-3 text-[10px] font-black uppercase tracking-widest text-emerald-400 z-10 bg-black/80 px-3.5 py-1 rounded-full backdrop-blur-md border border-emerald-500/30 shadow-lg">
              Reproducir Video
            </span>
          </div>
        )}
      </div>
    );
  }

  // Standard or Google Drive Direct HTML5 Video (Sleek, Non-Intrusive)
  const videoSrc = driveConfig.isDrive
    ? `/api/video-stream?id=${driveConfig.fileId}`
    : src;

  return (
    <div 
      className={`relative w-full h-full overflow-hidden select-none bg-black flex items-center justify-center ${
        customOverlayControls ? "group cursor-pointer" : "pointer-events-none"
      }`}
      onClick={customOverlayControls ? togglePlay : undefined}
    >
      <video
        ref={videoRef}
        key={driveConfig.isDrive ? driveConfig.fileId || src : src}
        src={videoSrc}
        playsInline={playsInline}
        // @ts-ignore iOS Safari non-standard attribute
        webkit-playsinline="true"
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
        autoPlay={autoPlay}
        preload={autoPlay ? "auto" : "metadata"}
        referrerPolicy="no-referrer"
        loop={loop}
        muted={!customOverlayControls ? true : isMuted}
        controls={false}
        className={`${className} object-cover w-full h-full min-w-full min-h-full`}
        poster={autoPlay ? undefined : effectivePoster}
        onCanPlay={(e) => {
          if (autoPlay || !customOverlayControls) {
            e.currentTarget.muted = true;
            e.currentTarget.volume = 0;
            e.currentTarget.play().catch(() => {});
          }
        }}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => {});
          }
        }}
        onPlay={() => {
          if (customOverlayControls) {
            document.querySelectorAll("video").forEach((v) => {
              if (v !== videoRef.current) {
                v.pause();
              }
            });
          }
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
        {driveConfig.isDrive && (
          <>
            <source src={`https://lh3.googleusercontent.com/d/${driveConfig.fileId}=m22`} type="video/mp4" />
            <source src={`https://lh3.googleusercontent.com/d/${driveConfig.fileId}=m18`} type="video/mp4" />
            <source src={`https://drive.google.com/uc?export=download&id=${driveConfig.fileId}`} type="video/mp4" />
          </>
        )}
        Tu navegador no soporta reproducción de video HTML5.
      </video>

      {/* Poster / Thumbnail Overlay when not playing so video never appears pitch black (ONLY for interactive card players) */}
      {!isPlaying && effectivePoster && customOverlayControls && (
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

      {/* Modern, minimalist floating overlay with audio & playback controls */}
      {customOverlayControls && !controls && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2.5 sm:p-3 transition-opacity duration-300 z-10">
          {/* Top Audio Toggle Button */}
          <div className="flex justify-end items-center pointer-events-auto">
            <button
              onClick={toggleMute}
              title={isMuted ? "Activar Audio" : "Silenciar"}
              className="px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-all active:scale-95 shadow-xl flex items-center gap-1.5 cursor-pointer"
            >
              {isMuted ? (
                <>
                  <VolumeX size={13} className="text-gray-300" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-200">Activar Audio</span>
                </>
              ) : (
                <>
                  <Volume2 size={13} className="text-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Audio Activo</span>
                </>
              )}
            </button>
          </div>

          {/* Center Play / Pause Indicator */}
          {(!isPlaying || showTapIndicator) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[0.5px] pointer-events-none transition-opacity duration-300">
              <div className="w-13 h-13 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-2xl transform transition-transform group-hover:scale-110 active:scale-95 border border-emerald-400/40">
                {isPlaying ? <Pause size={22} className="fill-black" /> : <Play size={22} className="ml-0.5 fill-black" />}
              </div>
            </div>
          )}

          {/* Bottom Bar Controls (Interactive Scrubber & Playback Buttons) */}
          <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-1.5 pointer-events-auto z-20">
            {/* Interactive Progress Bar Scrubber */}
            <div 
              className="w-full h-1.5 bg-white/25 hover:h-2 rounded-full cursor-pointer overflow-hidden transition-all relative"
              onClick={(e) => {
                e.stopPropagation();
                if (videoRef.current && videoRef.current.duration) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  videoRef.current.currentTime = pos * videoRef.current.duration;
                  setProgress(pos * 100);
                }
              }}
            >
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Bottom Bar Controls */}
            <div className="flex items-center justify-between text-white text-xs px-0.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  className="p-1 rounded-full hover:bg-white/20 transition-colors text-white cursor-pointer"
                  title={isPlaying ? "Pausar" : "Reproducir"}
                >
                  {isPlaying ? <Pause size={15} className="fill-white" /> : <Play size={15} className="fill-white ml-0.5" />}
                </button>

                <button
                  onClick={toggleMute}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer border border-white/15"
                >
                  {isMuted ? (
                    <>
                      <VolumeX size={13} className="text-gray-300" />
                      <span className="text-[10px] text-gray-300 font-medium">Sin Sonido</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={13} className="text-emerald-400" />
                      <span className="text-[10px] text-emerald-400 font-bold">Con Sonido</span>
                    </>
                  )}
                </button>
              </div>

              {/* Time indicator */}
              <div className="text-[9px] font-mono text-gray-300 bg-black/50 px-2 py-0.5 rounded-full border border-white/10">
                {videoRef.current && videoRef.current.duration
                  ? `${Math.floor(videoRef.current.currentTime)}s / ${Math.floor(videoRef.current.duration)}s`
                  : "0s"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

