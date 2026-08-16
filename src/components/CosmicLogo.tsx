import React, { useEffect, useRef, useState } from "react";

interface CosmicLogoProps {
  src: string;
  alt?: string;
  className?: string;
  glowColor?: string;
  glowMode?: boolean;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
  hasFlare: boolean;
  parallaxSpeed: number;
}

interface Meteor {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  alpha: number;
  active: boolean;
  delay: number;
}

export default function CosmicLogo({
  src,
  alt = "Tetra Hats Logo",
  className = "",
  glowColor = "#10b981",
  glowMode = false
}: CosmicLogoProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 500, height: 500 });

  // Pre-load image to verify availability and dimensions
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      setImageLoaded(true);
      if (img.naturalWidth && img.naturalHeight) {
        setDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      }
    };
    img.onerror = () => {
      setImageError(true);
      setImageLoaded(true);
    };
  }, [src]);

  // Starry Animation Engine matching the site's exact StarryBackground
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const resize = () => {
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width || 450;
      height = rect.height || 450;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      initCosmos();
    };

    // Exact night sky colors from site's StarryBackground: pure white, soft gold, subtle rose, violet, pale ice
    const starColors = [
      "#FFFFFF",
      "#FFFFFF",
      "#FFFFFF",
      "#F8FAFC",
      "#FDE68A", // Starlight amber/gold
      "#F472B6", // Subtle starlight rose/magenta
      "#C084FC", // Subtle cosmic violet
      glowMode ? glowColor : "#FDE68A"
    ];

    let stars: Star[] = [];
    let meteors: Meteor[] = [];

    function initCosmos() {
      stars = [];
      // Organic density proportioned to logo dimensions
      const count = 90;

      for (let i = 0; i < count; i++) {
        // Natural distribution: predominantly small delicate starlight pinpoints
        const radius = Math.random() < 0.82
          ? Math.random() * 0.9 + 0.4
          : Math.random() * 1.5 + 1.1;

        const hasFlare = radius > 1.6 && Math.random() < 0.3;
        // Parallax depth factor: closer/larger stars move faster during scroll
        const parallaxSpeed = 0.35 + (radius / 2.0) * 0.45;

        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius,
          baseAlpha: Math.random() * 0.55 + 0.35,
          alpha: Math.random(),
          twinkleSpeed: Math.random() * 0.025 + 0.008,
          twinklePhase: Math.random() * Math.PI * 2,
          color: starColors[Math.floor(Math.random() * starColors.length)],
          hasFlare,
          parallaxSpeed
        });
      }

      meteors = [
        createMeteor(0),
        createMeteor(160),
        createMeteor(320)
      ];
    }

    function createMeteor(initialDelay: number = 0): Meteor {
      return {
        x: Math.random() * width * 1.2 - width * 0.1,
        y: Math.random() * (height * 0.45),
        length: Math.random() * 70 + 40,
        speed: Math.random() * 9 + 6,
        angle: Math.PI / 4 + (Math.random() * 0.15 - 0.075),
        alpha: 0,
        active: false,
        delay: initialDelay || Math.floor(Math.random() * 260 + 120)
      };
    }

    resize();
    window.addEventListener("resize", resize);

    let targetScrollY = typeof window !== "undefined" ? window.scrollY : 0;
    let smoothedScrollY = targetScrollY;

    const handleScroll = () => {
      targetScrollY = window.scrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    let time = 0;

    const render = () => {
      time += 0.01;
      // Smooth lerp scroll displacement
      smoothedScrollY += (targetScrollY - smoothedScrollY) * 0.12;

      ctx.clearRect(0, 0, width, height);

      // 1. Deep space black canvas (matching the pure black background of the site, no blue haze)
      ctx.fillStyle = "#030305";
      ctx.fillRect(0, 0, width, height);

      // Subtle deep radial falloff at the center
      const centerDust = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        10,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.6
      );
      centerDust.addColorStop(0, "rgba(10, 10, 15, 0.4)");
      centerDust.addColorStop(1, "rgba(0, 0, 0, 0.95)");
      ctx.fillStyle = centerDust;
      ctx.fillRect(0, 0, width, height);

      // 2. Render Twinkling Stars with Scroll Parallax
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.twinklePhase += star.twinkleSpeed;
        const currentAlpha = Math.max(
          0.15,
          star.baseAlpha + Math.sin(star.twinklePhase) * 0.4
        );

        // Seamless vertical wrapping with scroll parallax
        const starRenderY = ((star.y - smoothedScrollY * star.parallaxSpeed) % height + height) % height;

        ctx.save();
        ctx.globalAlpha = Math.min(1, currentAlpha);
        ctx.fillStyle = star.color;

        // Core star
        ctx.beginPath();
        ctx.arc(star.x, starRenderY, star.radius, 0, Math.PI * 2);
        ctx.fill();

        // Delicate soft halo for medium stars
        if (star.radius > 1.0) {
          ctx.beginPath();
          ctx.arc(star.x, starRenderY, star.radius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = star.color;
          ctx.globalAlpha = currentAlpha * 0.2;
          ctx.fill();
        }

        // Cross Flare for rare bright stars
        if (star.hasFlare && currentAlpha > 0.6) {
          ctx.strokeStyle = star.color;
          ctx.lineWidth = 0.75;
          ctx.globalAlpha = currentAlpha * 0.5;
          const flareLen = star.radius * 3.8;

          ctx.beginPath();
          ctx.moveTo(star.x - flareLen, starRenderY);
          ctx.lineTo(star.x + flareLen, starRenderY);
          ctx.moveTo(star.x, starRenderY - flareLen);
          ctx.lineTo(star.x, starRenderY + flareLen);
          ctx.stroke();
        }

        ctx.restore();
      }

      // 3. Render Shooting Stars
      for (let i = 0; i < meteors.length; i++) {
        const m = meteors[i];

        if (!m.active) {
          m.delay--;
          if (m.delay <= 0) {
            m.active = true;
            m.alpha = 1;
          }
          continue;
        }

        m.x += Math.cos(m.angle) * m.speed;
        m.y += Math.sin(m.angle) * m.speed;
        m.alpha -= 0.02;

        if (m.alpha <= 0 || m.x > width + 50 || m.y > height + 50) {
          meteors[i] = createMeteor();
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, m.alpha);

        const tailX = m.x - Math.cos(m.angle) * m.length;
        const tailY = m.y - Math.sin(m.angle) * m.length;

        const mGrad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
        mGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
        mGrad.addColorStop(0.3, "rgba(253, 230, 138, 0.6)");
        mGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.strokeStyle = mGrad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(m.x, m.y, 1.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, [glowColor, glowMode, imageLoaded]);

  // If image fails, fallback to simple image
  if (imageError) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative inline-block select-none overflow-visible group/cosmic-logo ${className}`}
      style={{
        aspectRatio: `${dimensions.width} / ${dimensions.height}`,
      }}
    >
      {/* 1. Sleek, Subtle White Border Contour so the TH shape stays crisp over video */}
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-contain pointer-events-none absolute inset-0 opacity-20 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] transition-opacity duration-500 group-hover/cosmic-logo:opacity-35"
        referrerPolicy="no-referrer"
        aria-hidden="true"
      />

      {/* 2. The Animated Stars & Meteors Space Canvas Masked by Logo Shape */}
      <div
        className="w-full h-full relative z-10 transition-transform duration-700 group-hover/cosmic-logo:scale-[1.01]"
        style={{
          WebkitMaskImage: `url("${src}")`,
          maskImage: `url("${src}")`,
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
        />
      </div>

      {/* 3. Pure White Subtle Outline Rim */}
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-contain pointer-events-none absolute inset-0 opacity-15 mix-blend-screen transition-opacity duration-500 group-hover/cosmic-logo:opacity-25"
        referrerPolicy="no-referrer"
        aria-hidden="true"
      />
    </div>
  );
}
