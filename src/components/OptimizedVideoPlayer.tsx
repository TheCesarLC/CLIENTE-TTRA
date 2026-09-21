import React, { useState, useRef, useEffect, useMemo } from "react";
import { 
  getDriveMediaConfig, 
  isCloudinaryVideoUrl, 
  getOptimizedCloudinaryVideoUrl, 
  getOptimizedCloudinaryPosterUrl,
  isImageKitVideoUrl,
  getOptimizedImageKitVideoUrl,
  getOptimizedImageKitPosterUrl,
  isVimeoUrl,
  extractVimeoConfig,
  getVimeoEmbedUrl
} from "../lib/mediaUtils";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

interface OptimizedVideoPlayerProps {
  id?: string;
  activeVideoId?: string | null;
  onPlayRequest?: (id: string | null) => void;
  src: string;
  poster?: string;
  fallbackPoster?: string;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  onClick?: () => void;
  customOverlayControls?: boolean;
  isHero?: boolean;
  transparentBg?: boolean;
  videoScale?: string;
  videoFit?: string;
}

export default function OptimizedVideoPlayer({
  id,
  activeVideoId,
  onPlayRequest,
  src,
  poster,
  fallbackPoster,
  className = "w-full h-full object-cover",
  controls = false,
  autoPlay = false,
  loop = true,
  muted = false,
  playsInline = true,
  onClick,
  customOverlayControls = true,
  isHero = false,
  transparentBg = false,
  videoScale = "auto",
  videoFit = "cover",
}: OptimizedVideoPlayerProps) {
  const [videoError, setVideoError] = useState(false);
  const [usingFallbackSrc, setUsingFallbackSrc] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const [isMuted, setIsMuted] = useState(isHero || autoPlay ? true : muted);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasRenderedFrame, setHasRenderedFrame] = useState(false);
  const [isVerticalVideo, setIsVerticalVideo] = useState(false);
  const [progress, setProgress] = useState(0);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [showTapIndicator, setShowTapIndicator] = useState(false);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const driveConfig = useMemo(() => getDriveMediaConfig(src), [src]);
  const isCloudinary = useMemo(() => isCloudinaryVideoUrl(src), [src]);
  const isImageKit = useMemo(() => isImageKitVideoUrl(src), [src]);
  const vimeoConfig = useMemo(() => extractVimeoConfig(src), [src]);

  // Build ordered list of candidate poster URLs to test sequentially
  const posterCandidates: string[] = useMemo(() => {
    const list: string[] = [];

    // 1. Explicit poster prop passed from parent/admin config
    if (poster && typeof poster === "string" && poster.trim()) {
      list.push(poster.trim());
    }

    // 2. Provider dynamic thumbnails / frames
    if (vimeoConfig.isVimeo && vimeoConfig.videoId) {
      list.push(`https://vumbnail.com/${vimeoConfig.videoId}.jpg`);
    } else if (isImageKit) {
      const ikPoster = getOptimizedImageKitPosterUrl(src, isHero ? 960 : 480);
      if (ikPoster) list.push(ikPoster);
    } else if (driveConfig.isDrive && driveConfig.fileId) {
      if (driveConfig.thumbnailUrl) list.push(driveConfig.thumbnailUrl);
    } else if (isCloudinary) {
      const autoPoster = getOptimizedCloudinaryPosterUrl(src, isHero ? 960 : 480, "auto");
      if (autoPoster) list.push(autoPoster);

      const offsetPoster = getOptimizedCloudinaryPosterUrl(src, isHero ? 960 : 480, "1.0");
      if (offsetPoster && offsetPoster !== autoPoster) list.push(offsetPoster);
    } else if (src && src.includes("cloudinary.com") && /\.(mp4|mov|webm)(\?.*)?$/i.test(src)) {
      list.push(src.replace(/\.(mp4|mov|webm)(\?.*)?$/i, ".jpg$2"));
    }

    // 3. Fallback poster (e.g. corresponding cap product image)
    if (fallbackPoster && typeof fallbackPoster === "string" && fallbackPoster.trim() && !list.includes(fallbackPoster.trim())) {
      list.push(fallbackPoster.trim());
    }

    return list;
  }, [poster, src, fallbackPoster, driveConfig, isCloudinary, isImageKit, vimeoConfig, isHero]);

  // Reset candidate index when inputs change
  useEffect(() => {
    setCandidateIndex(0);
    setPosterError(false);
  }, [poster, src, fallbackPoster]);

  const currentPoster = !posterError && candidateIndex < posterCandidates.length 
    ? posterCandidates[candidateIndex] 
    : fallbackPoster;

  // Handle poster load failure by advancing to next candidate
  const handlePosterError = () => {
    if (candidateIndex < posterCandidates.length - 1) {
      setCandidateIndex((prev) => prev + 1);
    } else {
      setPosterError(true);
    }
  };

  // Sync external activeVideoId state (Mutual exclusion: only 1 video plays at a time, Hero excluded)
  useEffect(() => {
    if (isHero) return;
    if (id && activeVideoId !== undefined) {
      if (activeVideoId && activeVideoId === id) {
        setIsPlaying(true);
        if (videoRef.current && videoRef.current.paused) {
          videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {
            if (videoRef.current) {
              videoRef.current.muted = true;
              setIsMuted(true);
              videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
            }
          });
        }
      } else {
        setIsPlaying(false);
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
      }
    }
  }, [activeVideoId, id, isHero]);

  // Compute optimized video source
  const videoSrc = useMemo(() => {
    if (!src) return "";
    if (usingFallbackSrc) return src;
    if (isImageKit) return getOptimizedImageKitVideoUrl(src, { width: isHero ? 720 : 480, isHero });
    if (driveConfig.isDrive) return `/api/video-stream?id=${driveConfig.fileId}`;
    if (isCloudinary) return getOptimizedCloudinaryVideoUrl(src, { width: isHero ? 720 : 480, isHero });
    return src;
  }, [src, usingFallbackSrc, isImageKit, isHero, driveConfig, isCloudinary]);

  // Autoplay and playback initialization for Hero or autoPlay videos
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    if (isHero || autoPlay) {
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      video.setAttribute("muted", "");
      
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setHasRenderedFrame(true);
          })
          .catch(() => {
            // Autoplay restricted by browser: unlock on first touch or click
            const unlockHandler = () => {
              if (videoRef.current) {
                videoRef.current.muted = true;
                videoRef.current.defaultMuted = true;
                videoRef.current.play().then(() => {
                  setIsPlaying(true);
                  setHasRenderedFrame(true);
                }).catch(() => {});
              }
              window.removeEventListener("touchstart", unlockHandler);
              window.removeEventListener("click", unlockHandler);
              window.removeEventListener("scroll", unlockHandler);
            };
            window.addEventListener("touchstart", unlockHandler, { once: true });
            window.addEventListener("click", unlockHandler, { once: true });
            window.addEventListener("scroll", unlockHandler, { once: true });
          });
      }
    }
  }, [videoSrc, isHero, autoPlay]);

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
        // Pause any other playing HTML5 videos on the page immediately (except hero background video)
        document.querySelectorAll("video").forEach((v) => {
          if (v !== videoRef.current && v.getAttribute("data-hero") !== "true") {
            v.pause();
          }
        });

        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              if (id && onPlayRequest) {
                onPlayRequest(id);
              }
            })
            .catch(() => {
              // Fallback to muted playback if autoplay restrictions trigger
              if (videoRef.current) {
                videoRef.current.muted = true;
                setIsMuted(true);
                videoRef.current
                  .play()
                  .then(() => {
                    setIsPlaying(true);
                    if (id && onPlayRequest) {
                      onPlayRequest(id);
                    }
                  })
                  .catch((err) => console.warn("Video playback error:", err));
              }
            });
        }
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

  // If no source provided at all, render nothing
  if (!src) return null;

  // 1. If Vimeo video in Hero: render optimized full-bleed background iframe with PC widescreen adaptation
  if (isHero && vimeoConfig.isVimeo && vimeoConfig.videoId) {
    const heroVimeoUrl = getVimeoEmbedUrl(src, { isHero: true });

    // Adaptive scale for PC widescreen: expands the vertical 9:16 Vimeo video horizontally to cover the monitor without black bars
    let vimeoScaleClasses = "w-[130%] h-[130%] md:w-[320%] md:h-[320%] lg:w-[360%] lg:h-[360%] xl:w-[400%] xl:h-[400%]";
    if (videoScale === "1" || videoScale === "1.0") {
      vimeoScaleClasses = "w-[100%] h-[100%]";
    } else if (videoScale === "1.5") {
      vimeoScaleClasses = "w-[115%] h-[115%] md:w-[150%] md:h-[150%] lg:w-[180%] lg:h-[180%]";
    } else if (videoScale === "2" || videoScale === "2.0") {
      vimeoScaleClasses = "w-[120%] h-[120%] md:w-[200%] md:h-[200%] lg:w-[240%] lg:h-[240%]";
    } else if (videoScale === "2.5") {
      vimeoScaleClasses = "w-[125%] h-[125%] md:w-[260%] md:h-[260%] lg:w-[300%] lg:h-[300%]";
    } else if (videoScale === "3" || videoScale === "3.0") {
      vimeoScaleClasses = "w-[130%] h-[130%] md:w-[300%] md:h-[300%] lg:w-[330%] lg:h-[330%]";
    } else if (videoScale === "3.2") {
      vimeoScaleClasses = "w-[130%] h-[130%] md:w-[320%] md:h-[320%] lg:w-[350%] lg:h-[350%]";
    } else if (videoScale === "3.5") {
      vimeoScaleClasses = "w-[130%] h-[130%] md:w-[340%] md:h-[340%] lg:w-[370%] lg:h-[370%] xl:w-[400%] xl:h-[400%]";
    } else if (videoScale === "3.8") {
      vimeoScaleClasses = "w-[130%] h-[130%] md:w-[360%] md:h-[360%] lg:w-[400%] lg:h-[400%] xl:w-[430%] xl:h-[430%]";
    }

    return (
      <div 
        ref={containerRef}
        className="relative w-full h-full overflow-hidden bg-black flex items-center justify-center pointer-events-none select-none"
      >
        {/* Ambient Dynamic Background Layer: covers entire screen with blurred video light so NO black borders appear on PC */}
        <iframe
          src={heroVimeoUrl}
          className="absolute inset-0 w-[450%] h-[450%] -ml-[175%] -mt-[175%] object-cover pointer-events-none border-0 filter blur-3xl opacity-80 scale-150"
          allow="autoplay; fullscreen; picture-in-picture"
          tabIndex={-1}
          title="Hero Vimeo Ambient Background"
        />

        {/* Foreground Hero Vimeo Video adapted to PC widescreen */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
          <iframe
            src={heroVimeoUrl}
            className={`${vimeoScaleClasses} max-w-none flex-shrink-0 object-cover pointer-events-none border-0 transition-all duration-700`}
            allow="autoplay; fullscreen; picture-in-picture"
            tabIndex={-1}
            title="Hero Vimeo Video"
          />
        </div>
      </div>
    );
  }

  // 2. If Vimeo video in interactive/section mode:
  if (vimeoConfig.isVimeo && vimeoConfig.videoId) {
    const isThisActive = id ? activeVideoId === id : isPlaying;
    const vimeoPlayUrl = getVimeoEmbedUrl(src, {
      autoplay: true,
      muted: isMuted,
      loop: loop,
      controls: true,
    });

    return (
      <div 
        ref={containerRef}
        className={`relative w-full h-full overflow-hidden select-none ${
          transparentBg ? "bg-transparent" : "bg-neutral-950"
        } flex items-center justify-center ${
          customOverlayControls ? "group cursor-pointer" : ""
        }`}
      >
        {isThisActive || autoPlay ? (
          <div className="relative w-full h-full">
            <iframe
              src={vimeoPlayUrl}
              className="w-full h-full border-0 object-cover"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="Vimeo Video Player"
            />
            {/* Minimalist Floating Controls */}
            <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(false);
                  if (id && onPlayRequest) onPlayRequest(null);
                }}
                className="px-2.5 py-1 rounded-full bg-black/75 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 text-[9px] font-bold uppercase tracking-wider transition-all shadow-xl cursor-pointer flex items-center gap-1"
              >
                <Pause size={10} className="text-white" />
                <span>Pausar</span>
              </button>
            </div>
          </div>
        ) : (
          <div 
            className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-neutral-950 relative overflow-hidden cursor-pointer"
            onClick={() => {
              setIsPlaying(true);
              if (id && onPlayRequest) {
                onPlayRequest(id);
              }
            }}
          >
            {currentPoster && (
              <img 
                src={currentPoster} 
                alt="Vista Previa Video" 
                className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" 
                referrerPolicy="no-referrer"
                onError={handlePosterError}
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

  // If Google Drive link failed to stream directly in HTML5 video, render clean iframe as fallback
  if (driveConfig.isDrive && videoError) {
    const isThisActive = id ? activeVideoId === id : false;
    return (
      <div 
        ref={containerRef}
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
            {currentPoster && (
              <img 
                src={currentPoster} 
                alt="Vista Previa" 
                className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" 
                referrerPolicy="no-referrer"
                onError={handlePosterError}
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

  // Dynamic scale classes for Hero video to adapt seamlessly to PC screens (eliminating vertical black bars completely)
  // Scale on PC is engineered to 3.3x - 4.0x so that even vertical 9:16 videos (which occupy ~31.6% width inside a landscape container) completely overflow and fill 100% of PC widescreen monitors without lateral black bars.
  let heroPcScaleClasses = "scale-105 sm:scale-110 md:scale-[3.3] lg:scale-[3.6] xl:scale-[4.0]";
  let heroCustomTransform: string | undefined = undefined;

  if (videoScale === "1" || videoScale === "1.0") {
    heroPcScaleClasses = "scale-100";
  } else if (videoScale === "1.5") {
    heroPcScaleClasses = "scale-105 md:scale-125 lg:scale-150";
  } else if (videoScale === "2" || videoScale === "2.0") {
    heroPcScaleClasses = "scale-105 md:scale-150 lg:scale-[2.0]";
  } else if (videoScale === "2.5") {
    heroPcScaleClasses = "scale-105 md:scale-[2.2] lg:scale-[2.5]";
  } else if (videoScale === "3" || videoScale === "3.0") {
    heroPcScaleClasses = "scale-105 md:scale-[2.8] lg:scale-[3.0] xl:scale-[3.2]";
  } else if (videoScale === "3.2") {
    heroPcScaleClasses = "scale-105 md:scale-[3.0] lg:scale-[3.2] xl:scale-[3.4]";
  } else if (videoScale === "3.5") {
    heroPcScaleClasses = "scale-105 md:scale-[3.2] lg:scale-[3.5] xl:scale-[3.8]";
  } else if (videoScale === "3.8") {
    heroPcScaleClasses = "scale-105 md:scale-[3.4] lg:scale-[3.8] xl:scale-[4.2]";
  } else if (videoScale === "4" || videoScale === "4.0") {
    heroPcScaleClasses = "scale-105 md:scale-[3.6] lg:scale-[4.0] xl:scale-[4.4]";
  } else if (videoScale && videoScale !== "auto") {
    const parsed = parseFloat(videoScale);
    if (!isNaN(parsed) && parsed > 0) {
      heroCustomTransform = `scale(${parsed})`;
    }
  }

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none ${transparentBg ? "bg-transparent" : "bg-neutral-950"} flex items-center justify-center ${
        customOverlayControls ? "group cursor-pointer" : "pointer-events-none"
      }`}
      onClick={customOverlayControls ? togglePlay : undefined}
    >
      {/* Background Ambience / Dynamic Reflection Layer: eliminates black bars on PC widescreen */}
      <div className={`absolute inset-0 ${transparentBg ? "bg-transparent" : "bg-gradient-to-br from-neutral-900 via-neutral-950 to-black"} pointer-events-none z-0 overflow-hidden`}>
        {/* Dynamic ambient video clone that paints the entire monitor with soft video light */}
        {isHero && videoSrc && (
          <video
            src={videoSrc}
            playsInline
            autoPlay
            loop
            muted
            aria-hidden="true"
            tabIndex={-1}
            className="absolute inset-0 w-full h-full object-cover filter blur-3xl scale-[3.5] md:scale-[4.5] opacity-75 pointer-events-none"
          />
        )}

        {/* Poster fallback with ambient glow */}
        {currentPoster && (
          <>
            {isHero && (
              <img
                src={currentPoster}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover filter blur-3xl scale-[3.5] md:scale-[4.5] opacity-75 pointer-events-none"
                referrerPolicy="no-referrer"
              />
            )}
            <img
              src={currentPoster}
              alt="Vista previa video"
              className={`w-full h-full object-cover brightness-[0.9] contrast-[1.05] transition-all duration-700 ${
                isHero ? `${heroPcScaleClasses} origin-center` : "group-hover:scale-105"
              } ${hasRenderedFrame && isPlaying ? "opacity-0" : "opacity-100"}`}
              style={isHero && heroCustomTransform ? { transform: heroCustomTransform } : undefined}
              onError={handlePosterError}
              referrerPolicy="no-referrer"
            />
          </>
        )}
        {!transparentBg && !isHero && (
          <div className={`absolute inset-0 bg-black/25 transition-opacity duration-500 ${hasRenderedFrame && isPlaying ? "opacity-0" : "opacity-100"}`} />
        )}
      </div>

      <video
        ref={videoRef}
        src={videoSrc}
        data-hero={isHero ? "true" : undefined}
        playsInline={playsInline}
        // @ts-ignore iOS Safari non-standard attribute
        webkit-playsinline="true"
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
        autoPlay={autoPlay || isHero}
        preload="auto"
        loop={loop}
        muted={isHero || autoPlay ? true : isMuted}
        controls={false}
        className={`${className} relative z-[1] object-cover w-full h-full min-w-full min-h-full ${
          isHero ? `${heroPcScaleClasses} origin-center max-w-none` : ""
        } transition-transform duration-700`}
        style={isHero && heroCustomTransform ? { transform: heroCustomTransform } : undefined}
        poster={currentPoster}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (v.videoWidth && v.videoHeight) {
            setIsVerticalVideo(v.videoHeight > v.videoWidth);
          }
        }}
        onLoadedData={() => {
          setHasRenderedFrame(true);
        }}
        onCanPlay={(e) => {
          setHasRenderedFrame(true);
          if (autoPlay || isHero) {
            e.currentTarget.muted = true;
            e.currentTarget.defaultMuted = true;
            e.currentTarget.play().then(() => setIsPlaying(true)).catch(() => {});
          }
        }}
        onPlaying={() => {
          setHasRenderedFrame(true);
          setIsPlaying(true);
        }}
        onTimeUpdate={(e) => {
          if (!hasRenderedFrame && e.currentTarget.currentTime > 0) {
            setHasRenderedFrame(true);
          }
          handleTimeUpdate();
        }}
        onEnded={() => {
          if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => {});
          }
        }}
        onPlay={() => {
          setHasRenderedFrame(true);
          if (customOverlayControls) {
            document.querySelectorAll("video").forEach((v) => {
              if (v !== videoRef.current && v.getAttribute("data-hero") !== "true") {
                v.pause();
              }
            });
          }
          setIsPlaying(true);
          if (id && onPlayRequest && activeVideoId !== id) {
            onPlayRequest(id);
          }
        }}
        onPause={() => {
          setIsPlaying(false);
          if (isHero && videoRef.current && videoRef.current.paused) {
            videoRef.current.play().catch(() => {});
          }
        }}
        onError={() => {
          if (driveConfig.isDrive) {
            setVideoError(true);
          } else if (!usingFallbackSrc && src) {
            setUsingFallbackSrc(true);
          }
        }}
      >
        Tu navegador no soporta reproducción de video HTML5.
      </video>

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
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="pointer-events-auto w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-2xl transform transition-transform hover:scale-110 active:scale-95 border border-emerald-400/40 cursor-pointer"
                aria-label={isPlaying ? "Pausar video" : "Reproducir video"}
              >
                {isPlaying ? <Pause size={24} className="fill-black" /> : <Play size={24} className="ml-1 fill-black" />}
              </button>
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
