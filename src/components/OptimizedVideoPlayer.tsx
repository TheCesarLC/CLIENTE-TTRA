import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
  getVimeoEmbedUrl,
  isYouTubeUrl,
  extractYouTubeConfig,
  getYouTubeEmbedUrl
} from "../lib/mediaUtils";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

/**
 * Global singleton helper to ensure the YouTube IFrame API script is loaded and ready.
 */
function ensureYouTubeIframeApi(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject();
  if ((window as any).YT && (window as any).YT.Player) {
    return Promise.resolve((window as any).YT);
  }
  return new Promise((resolve) => {
    let script = document.getElementById("yt-iframe-api") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "yt-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
    const prev = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") prev();
      resolve((window as any).YT);
    };
    const poll = setInterval(() => {
      if ((window as any).YT && (window as any).YT.Player) {
        clearInterval(poll);
        resolve((window as any).YT);
      }
    }, 100);
    setTimeout(() => clearInterval(poll), 10000);
  });
}

/**
 * Dedicated Background YouTube Player for Hero section.
 * Engineered specifically so that the player NEVER shows play controls, center play buttons,
 * end-screens, or pause overlays when reloading / looping automatically.
 */
function HeroYouTubeBackground({
  src,
  videoId,
  currentPoster,
  thumbnailUrl,
  aiEnhance,
  videoScale,
  isShort,
}: {
  src: string;
  videoId: string;
  currentPoster?: string;
  thumbnailUrl?: string;
  aiEnhance?: boolean;
  videoScale?: string;
  isShort?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const heroYtUrl = useMemo(() => {
    return getYouTubeEmbedUrl(src, { isHero: true });
  }, [src]);

  // Seamless postMessage sender to YouTube iframe
  const sendIframeCommand = useCallback((func: string, args: any[] = []) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func, args }),
          "*"
        );
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let loopChecker: NodeJS.Timeout | null = null;

    // Listen to YouTube postMessages to instantly handle ended/paused states before controls can render
    const handleWindowMessage = (e: MessageEvent) => {
      try {
        let data = e.data;
        if (typeof data === "string") {
          data = JSON.parse(data);
        }
        if (data && data.event === "onStateChange") {
          // 0 = ENDED, 2 = PAUSED
          if (data.info === 0 || data.info === 2) {
            sendIframeCommand("seekTo", [0, true]);
            sendIframeCommand("playVideo");
          } else if (data.info === 1) {
            // PLAYING
            if (isMounted) setIsLoaded(true);
          }
        } else if (data && data.event === "initialDelivery") {
          sendIframeCommand("mute");
          sendIframeCommand("playVideo");
        }
      } catch (_) {}
    };

    window.addEventListener("message", handleWindowMessage);

    // Initialize YouTube Iframe API for millisecond-level loop control
    ensureYouTubeIframeApi().then((YT) => {
      if (!isMounted || !iframeRef.current) return;

      try {
        playerRef.current = new YT.Player(iframeRef.current, {
          events: {
            onReady: (event: any) => {
              if (!isMounted) return;
              event.target.mute();
              event.target.playVideo();
              if (typeof event.target.setPlaybackQuality === "function") {
                event.target.setPlaybackQuality("hd1080");
              }
              setIsLoaded(true);
            },
            onStateChange: (event: any) => {
              if (!isMounted) return;
              // 0 = ENDED, 1 = PLAYING, 2 = PAUSED
              if (event.data === 0) {
                // Continuous instant loop: seek to 0 and play immediately so NO end-screen or play button appears
                event.target.seekTo(0, true);
                event.target.playVideo();
              } else if (event.data === 2) {
                // Never remain paused with play button overlay
                event.target.playVideo();
              } else if (event.data === 1) {
                setIsLoaded(true);
              }
            },
          },
        });

        // Continuous Loop Watcher: check every 120ms
        // If the video is within 0.35s of the end, seek back to 0 immediately!
        // This PREVENTS YouTube from ever transitioning to the ENDED state,
        // so the player NEVER unloads, NEVER reloads, and NEVER renders the play button!
        loopChecker = setInterval(() => {
          const player = playerRef.current;
          if (player && typeof player.getCurrentTime === "function" && typeof player.getDuration === "function") {
            try {
              const currentTime = player.getCurrentTime();
              const duration = player.getDuration();
              if (duration > 0 && currentTime >= duration - 0.35) {
                player.seekTo(0, true);
                player.playVideo();
              }
            } catch (_) {}
          } else {
            sendIframeCommand("listening");
          }
        }, 120);
      } catch (_) {}
    });

    return () => {
      isMounted = false;
      window.removeEventListener("message", handleWindowMessage);
      if (loopChecker) clearInterval(loopChecker);
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        try {
          playerRef.current.destroy();
        } catch (_) {}
      }
    };
  }, [sendIframeCommand]);

  // Adaptive scale for PC widescreen: expands video horizontally to cover the monitor without black bars
  let ytScaleClasses = isShort
    ? "w-[130%] h-[130%] md:w-[320%] md:h-[320%] lg:w-[360%] lg:h-[360%] xl:w-[400%] xl:h-[400%]"
    : "w-[115%] h-[115%] md:w-[135%] md:h-[135%] lg:w-[150%] lg:h-[150%] xl:w-[170%] xl:h-[170%]";

  if (videoScale === "1" || videoScale === "1.0") {
    ytScaleClasses = "w-[100%] h-[100%]";
  } else if (videoScale === "1.5") {
    ytScaleClasses = "w-[115%] h-[115%] md:w-[150%] md:h-[150%] lg:w-[180%] lg:h-[180%]";
  } else if (videoScale === "2" || videoScale === "2.0") {
    ytScaleClasses = "w-[120%] h-[120%] md:w-[200%] md:h-[200%] lg:w-[240%] lg:h-[240%]";
  } else if (videoScale === "2.5") {
    ytScaleClasses = "w-[125%] h-[125%] md:w-[260%] md:h-[260%] lg:w-[300%] lg:h-[300%]";
  } else if (videoScale === "3" || videoScale === "3.0") {
    ytScaleClasses = "w-[130%] h-[130%] md:w-[300%] md:h-[300%] lg:w-[330%] lg:h-[330%]";
  } else if (videoScale === "3.2") {
    ytScaleClasses = "w-[130%] h-[130%] md:w-[320%] md:h-[320%] lg:w-[350%] lg:h-[350%]";
  } else if (videoScale === "3.5") {
    ytScaleClasses = "w-[130%] h-[130%] md:w-[340%] md:h-[340%] lg:w-[370%] lg:h-[370%] xl:w-[400%] xl:h-[400%]";
  } else if (videoScale === "3.8") {
    ytScaleClasses = "w-[130%] h-[130%] md:w-[360%] md:h-[360%] lg:w-[400%] lg:h-[400%] xl:w-[430%] xl:h-[430%]";
  }

  const posterSrc = currentPoster || thumbnailUrl || "";

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-black flex items-center justify-center pointer-events-none select-none"
    >
      {/* Ambient Dynamic Background: high-res YouTube poster with subtle blur fills widescreen monitor edges */}
      {posterSrc && (
        <img
          src={posterSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover filter blur-3xl opacity-65 scale-150 pointer-events-none transition-opacity duration-1000"
          referrerPolicy="no-referrer"
        />
      )}

      {/* Foreground Hero YouTube Video adapted to PC widescreen with zero black bars */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
        <iframe
          ref={iframeRef}
          src={heroYtUrl}
          loading="eager"
          className={`${ytScaleClasses} max-w-none flex-shrink-0 object-cover pointer-events-none border-0 transition-opacity duration-700 transform-gpu [backface-visibility:hidden] [transform:translateZ(0)] ${
            aiEnhance ? "contrast-[1.05] saturate-[1.08] brightness-[1.01]" : ""
          } ${isLoaded ? "opacity-100" : "opacity-95"}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          tabIndex={-1}
          title="Hero YouTube Video"
        />
      </div>

      {/* Smooth initial cover that crossfades away once video is playing */}
      {posterSrc && !isLoaded && (
        <div className="absolute inset-0 pointer-events-none transition-opacity duration-700">
          <img
            src={posterSrc}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover brightness-[0.7]"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
}

interface OptimizedVideoPlayerProps {
  key?: React.Key;
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
  aiEnhance?: boolean;
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
  aiEnhance = true,
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
  const ytConfig = useMemo(() => extractYouTubeConfig(src), [src]);

  // Build ordered list of candidate poster URLs to test sequentially
  const posterCandidates: string[] = useMemo(() => {
    const list: string[] = [];

    // 1. Explicit poster prop passed from parent/admin config
    if (poster && typeof poster === "string" && poster.trim()) {
      list.push(poster.trim());
    }

    // 2. Provider dynamic thumbnails / frames
    if (ytConfig.isYouTube && ytConfig.videoId) {
      list.push(`https://img.youtube.com/vi/${ytConfig.videoId}/maxresdefault.jpg`);
      list.push(`https://img.youtube.com/vi/${ytConfig.videoId}/hqdefault.jpg`);
    } else if (vimeoConfig.isVimeo && vimeoConfig.videoId) {
      list.push(`https://vumbnail.com/${vimeoConfig.videoId}.jpg`);
    } else if (isImageKit) {
      const ikPoster = getOptimizedImageKitPosterUrl(src, isHero ? 1440 : 1080);
      if (ikPoster) list.push(ikPoster);
    } else if (driveConfig.isDrive && driveConfig.fileId) {
      if (driveConfig.thumbnailUrl) list.push(driveConfig.thumbnailUrl);
    } else if (isCloudinary) {
      const autoPoster = getOptimizedCloudinaryPosterUrl(src, isHero ? 1440 : 1080, "auto");
      if (autoPoster) list.push(autoPoster);

      const offsetPoster = getOptimizedCloudinaryPosterUrl(src, isHero ? 1440 : 1080, "1.0");
      if (offsetPoster && offsetPoster !== autoPoster) list.push(offsetPoster);
    } else if (src && src.includes("cloudinary.com") && /\.(mp4|mov|webm)(\?.*)?$/i.test(src)) {
      list.push(src.replace(/\.(mp4|mov|webm)(\?.*)?$/i, ".jpg$2"));
    }

    // 3. Fallback poster (e.g. corresponding cap product image)
    if (fallbackPoster && typeof fallbackPoster === "string" && fallbackPoster.trim() && !list.includes(fallbackPoster.trim())) {
      list.push(fallbackPoster.trim());
    }

    return list;
  }, [poster, src, fallbackPoster, driveConfig, isCloudinary, isImageKit, vimeoConfig, ytConfig, isHero]);

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

  // Compute optimized video source with maximum HD bitrate delivery
  const videoSrc = useMemo(() => {
    if (!src) return "";
    if (usingFallbackSrc) return src;
    if (isImageKit) {
      // tr=orig delivers the master stream (1080p/4K) directly from global CloudFront CDN
      return getOptimizedImageKitVideoUrl(src, { isHero });
    }
    if (driveConfig.isDrive) return `/api/video-stream?id=${driveConfig.fileId}`;
    if (isCloudinary) {
      // 1080p high quality master
      return getOptimizedCloudinaryVideoUrl(src, { width: 1920, quality: "auto:best", isHero });
    }
    return src;
  }, [src, usingFallbackSrc, isImageKit, isHero, driveConfig, isCloudinary]);

  // Bulletproof zero-latency autoplay engine with tab visibility & IntersectionObserver recovery
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    let isMounted = true;

    const attemptAutoplay = () => {
      if (!video) return;
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
            if (isMounted) {
              setIsPlaying(true);
              setHasRenderedFrame(true);
            }
          })
          .catch(() => {
            // Passive gesture unlock listener if browser blocks initial autoplay
            const unlockHandler = () => {
              if (video && isMounted) {
                video.muted = true;
                video.defaultMuted = true;
                video.play().then(() => {
                  setIsPlaying(true);
                  setHasRenderedFrame(true);
                }).catch(() => {});
              }
              window.removeEventListener("touchstart", unlockHandler);
              window.removeEventListener("click", unlockHandler);
              window.removeEventListener("scroll", unlockHandler);
            };
            window.addEventListener("touchstart", unlockHandler, { once: true, passive: true });
            window.addEventListener("click", unlockHandler, { once: true, passive: true });
            window.addEventListener("scroll", unlockHandler, { once: true, passive: true });
          });
      }
    };

    if (isHero || autoPlay) {
      attemptAutoplay();

      // Resume smoothly when tab returns to focus / active screen
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible" && (isHero || autoPlay)) {
          if (video && video.paused) {
            attemptAutoplay();
          }
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);

      // Intersection observer: trigger when video container enters viewport
      let observer: IntersectionObserver | null = null;
      if (containerRef.current && typeof IntersectionObserver !== "undefined") {
        observer = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (entry && entry.isIntersecting && video.paused && (isHero || autoPlay)) {
              attemptAutoplay();
            }
          },
          { threshold: 0.1 }
        );
        observer.observe(containerRef.current);
      }

      return () => {
        isMounted = false;
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        if (observer) observer.disconnect();
      };
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
      // Continuous instant seamless loop for background video before it hits ended state
      if (loop && isHero && videoRef.current.currentTime >= videoRef.current.duration - 0.25) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    }
  };

  // If no source provided at all, render nothing
  if (!src) return null;

  // 1a. If YouTube video in Hero: render dedicated background player with zero play controls on reload/loop
  if (isHero && ytConfig.isYouTube && ytConfig.videoId) {
    return (
      <HeroYouTubeBackground
        src={src}
        videoId={ytConfig.videoId}
        currentPoster={currentPoster}
        thumbnailUrl={ytConfig.thumbnailUrl}
        aiEnhance={aiEnhance}
        videoScale={videoScale}
        isShort={ytConfig.isShort}
      />
    );
  }

  // 1b. If YouTube video in interactive/section mode:
  if (ytConfig.isYouTube && ytConfig.videoId) {
    const isThisActive = id ? activeVideoId === id : isPlaying;
    const ytPlayUrl = getYouTubeEmbedUrl(src, {
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
              src={ytPlayUrl}
              className="w-full h-full border-0 object-cover"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              title="YouTube Video Player"
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
                alt="Vista Previa YouTube" 
                className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" 
                referrerPolicy="no-referrer"
                onError={handlePosterError}
              />
            )}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
            <div className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center shadow-2xl z-10 transition-transform group-hover:scale-110 active:scale-95 border border-red-500/40">
              <Play size={24} className="ml-0.5 fill-white" />
            </div>
            <span className="mt-3 text-[10px] font-black uppercase tracking-widest text-red-400 z-10 bg-black/80 px-3.5 py-1 rounded-full backdrop-blur-md border border-red-500/30 shadow-lg">
              Reproducir Video YouTube
            </span>
          </div>
        )}
      </div>
    );
  }

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
          referrerPolicy="strict-origin-when-cross-origin"
          tabIndex={-1}
          title="Hero Vimeo Ambient Background"
        />

        {/* Foreground Hero Vimeo Video adapted to PC widescreen */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
          <iframe
            src={heroVimeoUrl}
            className={`${vimeoScaleClasses} max-w-none flex-shrink-0 object-cover pointer-events-none border-0 transition-all duration-700`}
            allow="autoplay; fullscreen; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
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
              referrerPolicy="strict-origin-when-cross-origin"
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
            referrerPolicy="strict-origin-when-cross-origin"
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

  // Controls overlay must NEVER be shown on hero background video under any circumstances
  const showOverlayControls = customOverlayControls && !controls && !isHero;

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none ${transparentBg ? "bg-transparent" : "bg-neutral-950"} flex items-center justify-center ${
        showOverlayControls ? "group cursor-pointer" : "pointer-events-none"
      }`}
      onClick={showOverlayControls ? togglePlay : undefined}
    >
      {/* Background Ambience / Dynamic Reflection Layer: eliminates black bars on PC widescreen */}
      <div className={`absolute inset-0 ${transparentBg ? "bg-transparent" : "bg-gradient-to-br from-neutral-900 via-neutral-950 to-black"} pointer-events-none z-0 overflow-hidden`}>
        {/* Dynamic ambient video clone that paints the entire monitor with soft video light */}
        {isHero && videoSrc && (
          <video
            src={videoSrc}
            playsInline
            // @ts-ignore iOS Safari non-standard attribute
            webkit-playsinline="true"
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
            autoPlay
            loop
            muted
            controls={false}
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
        } transition-transform duration-700 transform-gpu [backface-visibility:hidden] [transform:translateZ(0)] will-change-transform`}
        style={{
          ...(isHero && heroCustomTransform ? { transform: heroCustomTransform } : {}),
          ...(aiEnhance ? {
            filter: "url(#ai-neural-clarity) contrast(1.06) saturate(1.10) brightness(1.01)",
            WebkitFilter: "contrast(1.06) saturate(1.10) brightness(1.01)"
          } : {})
        }}
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
        onWaiting={() => {
          // Graceful buffering without interrupting rendered frame
        }}
        onStalled={() => {
          // Automatic recovery if network buffer stalls
          if (videoRef.current && (isHero || autoPlay) && videoRef.current.paused) {
            videoRef.current.play().catch(() => {});
          }
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
          if (isHero) {
            // Background video must never toggle isPlaying to false or allow play buttons to show
            if (videoRef.current && videoRef.current.paused) {
              videoRef.current.play().catch(() => {});
            }
          } else {
            setIsPlaying(false);
          }
        }}
        onError={() => {
          if (driveConfig.isDrive) {
            setVideoError(true);
          } else if (!usingFallbackSrc && src) {
            setUsingFallbackSrc(true);
          }
          // Self-healing: try muted play on error recovery
          if (videoRef.current && (isHero || autoPlay)) {
            videoRef.current.muted = true;
            videoRef.current.defaultMuted = true;
            videoRef.current.play().catch(() => {});
          }
        }}
      >
        Tu navegador no soporta reproducción de video HTML5.
      </video>

      {/* Modern, minimalist floating overlay with audio & playback controls (Suppressed completely on Hero/background) */}
      {showOverlayControls && (
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
