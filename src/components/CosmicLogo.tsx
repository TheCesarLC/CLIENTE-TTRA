import React, { useEffect, useRef, useState } from "react";
import { getOptimizedImageUrl } from "../lib/imageOptimizer";

interface CosmicLogoProps {
  src?: string;
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
  layer: number;
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
  alt = "TETRA HATS",
  className = "",
  glowColor = "#10b981",
  glowMode = false
}: CosmicLogoProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [customImage, setCustomImage] = useState<HTMLImageElement | null>(null);
  const [isRendered, setIsRendered] = useState(false);

  // Check if valid custom image URL is provided (not empty or template placeholder)
  const hasCustomSrc = Boolean(
    src && 
    src.trim() !== "" && 
    !src.includes("umbra.page") && 
    !src.includes("example.com")
  );

  const optimizedSrc = hasCustomSrc ? getOptimizedImageUrl(src!, 1400) : "";

  // Preload custom image if provided
  useEffect(() => {
    if (!optimizedSrc) {
      setCustomImage(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.src = optimizedSrc;

    img.onload = () => {
      setCustomImage(img);
    };

    img.onerror = () => {
      setCustomImage(null);
    };
  }, [optimizedSrc]);

  // Main Canvas Cosmic Animation Engine with Scroll Parallax & Instant Render
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let cssWidth = 0;
    let cssHeight = 0;
    let dpr = 1;

    // Palette of starlight celestial colors
    const starColors = [
      "#FFFFFF",
      "#FFFFFF",
      "#FFFFFF",
      "#F8FAFC",
      "#FDE68A", // Celestial Amber Gold
      "#E0F2FE", // Ice Blue
      "#F472B6", // Soft Starlight Rose
      "#C084FC", // Cosmic Violet
      glowColor || "#10b981"
    ];

    let stars: Star[] = [];
    let meteors: Meteor[] = [];

    const initCosmos = (w: number, h: number) => {
      stars = [];
      const starCount = Math.max(110, Math.floor((w * h) / 750));

      for (let i = 0; i < starCount; i++) {
        const layerRand = Math.random();
        let layer = 0;
        let radius = Math.random() * 1.1 + 0.5;
        let parallaxSpeed = 0.22;

        if (layerRand > 0.55 && layerRand <= 0.85) {
          layer = 1;
          radius = Math.random() * 1.6 + 1.0;
          parallaxSpeed = 0.52;
        } else if (layerRand > 0.85) {
          layer = 2;
          radius = Math.random() * 2.4 + 1.4;
          parallaxSpeed = 0.95;
        }

        const hasFlare = (layer === 2 || radius > 1.8) && Math.random() < 0.45;

        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          radius,
          baseAlpha: layer === 2 ? Math.random() * 0.35 + 0.65 : Math.random() * 0.55 + 0.35,
          alpha: Math.random(),
          twinkleSpeed: Math.random() * 0.035 + 0.012,
          twinklePhase: Math.random() * Math.PI * 2,
          color: starColors[Math.floor(Math.random() * starColors.length)],
          hasFlare,
          parallaxSpeed,
          layer
        });
      }

      meteors = [
        createMeteor(w, h, 0),
        createMeteor(w, h, 70),
        createMeteor(w, h, 140),
        createMeteor(w, h, 210)
      ];
    };

    function createMeteor(w: number, h: number, initialDelay: number = 0): Meteor {
      return {
        x: Math.random() * (w * 1.3) - w * 0.15,
        y: Math.random() * (h * 0.6),
        length: Math.random() * (w * 0.25) + (w * 0.12),
        speed: Math.random() * 12 + 8,
        angle: Math.PI / 4.2 + (Math.random() * 0.18 - 0.09),
        alpha: 0,
        active: false,
        delay: initialDelay || Math.floor(Math.random() * 180 + 50)
      };
    }

    // Scroll parallax position tracking
    let targetScrollY = typeof window !== "undefined" ? window.scrollY : 0;
    let smoothedScrollY = targetScrollY;

    const handleScroll = () => {
      targetScrollY = window.scrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // Draw the Brand Mask shape (used for destination-in compositing)
    const drawBrandShape = (
      context: CanvasRenderingContext2D, 
      w: number, 
      h: number, 
      isOutline: boolean = false
    ) => {
      if (customImage && customImage.complete && customImage.naturalWidth > 0) {
        // Draw custom image centered
        const imgAspect = customImage.naturalWidth / customImage.naturalHeight;
        const maxW = w * 0.96;
        const maxH = h * 0.96;
        let drawW = maxW;
        let drawH = drawW / imgAspect;

        if (drawH > maxH) {
          drawH = maxH;
          drawW = drawH * imgAspect;
        }

        const drawX = (w - drawW) / 2;
        const drawY = (h - drawH) / 2;

        if (!isOutline) {
          context.drawImage(customImage, drawX, drawY, drawW, drawH);
        }
        return;
      }

      // Default Vector Brand Layout: Emblem + "TETRA HATS" + "EXCLUSIVE COLLECTION"
      context.textAlign = "center";
      context.textBaseline = "middle";

      const centerY = h * 0.52;
      const emblemSize = Math.max(26, Math.min(48, h * 0.23));
      const emblemY = centerY - h * 0.31;

      // 1. Geometric TH Crown Emblem
      context.save();
      context.translate(w / 2, emblemY);

      if (isOutline) {
        context.strokeStyle = "rgba(255, 255, 255, 0.95)";
        context.lineWidth = 2.0;
        context.beginPath();
        context.roundRect(-emblemSize * 0.65, -emblemSize * 0.65, emblemSize * 1.3, emblemSize * 1.3, 10);
        context.stroke();
      } else {
        context.fillStyle = "#FFFFFF";
        context.beginPath();
        context.roundRect(-emblemSize * 0.65, -emblemSize * 0.65, emblemSize * 1.3, emblemSize * 1.3, 10);
        context.fill();
      }
      context.restore();

      // 2. Main Title "TETRA HATS" - Majestic Grand Scale perfectly fitted
      const text = "T E T R A   H A T S";
      let baseFontSize = Math.max(28, Math.min(84, w * 0.082));
      context.font = `900 ${baseFontSize}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      
      const measuredWidth = context.measureText(text).width;
      if (measuredWidth > w * 0.86) {
        baseFontSize = Math.floor(baseFontSize * ((w * 0.86) / measuredWidth));
        context.font = `900 ${baseFontSize}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      }

      const textY = centerY + h * 0.06;

      if (isOutline) {
        context.strokeStyle = "rgba(255, 255, 255, 0.98)";
        context.lineWidth = Math.max(1.5, baseFontSize * 0.032);
        context.strokeText(text, w / 2, textY);
      } else {
        context.fillStyle = "#FFFFFF";
        context.fillText(text, w / 2, textY);
      }

      // 3. Subtitle "EXCLUSIVE COLLECTION"
      const subText = "E X C L U S I V E   C O L L E C T I O N";
      let subFontSize = Math.max(10, Math.min(17, baseFontSize * 0.22));
      context.font = `800 ${subFontSize}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      
      const subMeasuredWidth = context.measureText(subText).width;
      if (subMeasuredWidth > w * 0.72) {
        subFontSize = Math.floor(subFontSize * ((w * 0.72) / subMeasuredWidth));
        context.font = `800 ${subFontSize}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      }

      const subY = centerY + h * 0.37;

      if (isOutline) {
        context.strokeStyle = glowColor || "#10b981";
        context.lineWidth = 1.4;
        context.strokeText(subText, w / 2, subY);

        // Accent divider lines
        const subMetrics = context.measureText(subText);
        const lineLen = Math.max(24, w * 0.11);
        const lineY = subY;

        context.strokeStyle = "rgba(255, 255, 255, 0.65)";
        context.lineWidth = 1.6;

        // Left line
        context.beginPath();
        context.moveTo(w / 2 - subMetrics.width / 2 - lineLen - 14, lineY);
        context.lineTo(w / 2 - subMetrics.width / 2 - 14, lineY);
        context.stroke();

        // Right line
        context.beginPath();
        context.moveTo(w / 2 + subMetrics.width / 2 + 14, lineY);
        context.lineTo(w / 2 + subMetrics.width / 2 + lineLen + 14, lineY);
        context.stroke();
      } else {
        context.fillStyle = "#FFFFFF";
        context.fillText(subText, w / 2, subY);

        const subMetrics = context.measureText(subText);
        const lineLen = Math.max(24, w * 0.11);
        const lineY = subY;

        context.fillRect(w / 2 - subMetrics.width / 2 - lineLen - 14, lineY - 1.5, lineLen, 3);
        context.fillRect(w / 2 + subMetrics.width / 2 + 14, lineY - 1.5, lineLen, 3);
      }
    };

    const render = () => {
      // Smooth lerp scroll displacement for inner stars
      smoothedScrollY += (targetScrollY - smoothedScrollY) * 0.14;

      // 1. Clear full canvas to transparent (NO black background)
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      const w = cssWidth;
      const h = cssHeight;

      if (w <= 0 || h <= 0) {
        ctx.restore();
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // 2. Draw Stars and Meteors Cosmos layer (with deep cosmic glow inside)
      ctx.globalCompositeOperation = "source-over";

      // Subtle cosmic nebula backdrop behind stars
      const nebula = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.max(w, h) * 0.65);
      nebula.addColorStop(0, "rgba(25, 25, 38, 0.98)");
      nebula.addColorStop(0.5, "rgba(12, 12, 22, 0.95)");
      nebula.addColorStop(1, "rgba(5, 5, 12, 0.92)");
      ctx.fillStyle = nebula;
      ctx.fillRect(0, 0, w, h);

      // Render Twinkling Stars with Scroll Parallax inside the logo
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.twinklePhase += star.twinkleSpeed;
        const currentAlpha = Math.max(
          0.2,
          star.baseAlpha + Math.sin(star.twinklePhase) * 0.45
        );

        // Seamless vertical wrapping with depth scroll parallax
        const starRenderY = ((star.y - smoothedScrollY * star.parallaxSpeed) % h + h) % h;

        ctx.save();
        ctx.globalAlpha = Math.min(1, currentAlpha);
        ctx.fillStyle = star.color;

        // Core star
        ctx.beginPath();
        ctx.arc(star.x, starRenderY, star.radius, 0, Math.PI * 2);
        ctx.fill();

        // Starlight glow halo
        if (star.radius > 1.1) {
          ctx.beginPath();
          ctx.arc(star.x, starRenderY, star.radius * 2.3, 0, Math.PI * 2);
          ctx.fillStyle = star.color;
          ctx.globalAlpha = currentAlpha * 0.38;
          ctx.fill();
        }

        // Cross Flare on prominent stars
        if (star.hasFlare && currentAlpha > 0.55) {
          ctx.strokeStyle = star.color;
          ctx.lineWidth = star.layer === 2 ? 1.2 : 0.9;
          ctx.globalAlpha = currentAlpha * 0.7;
          const flareLen = star.radius * 4.0;

          ctx.beginPath();
          ctx.moveTo(star.x - flareLen, starRenderY);
          ctx.lineTo(star.x + flareLen, starRenderY);
          ctx.moveTo(star.x, starRenderY - flareLen);
          ctx.lineTo(star.x, starRenderY + flareLen);
          ctx.stroke();
        }

        ctx.restore();
      }

      // Render Shooting Meteors with Scroll Parallax
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
        m.alpha -= 0.016;

        if (m.alpha <= 0 || m.x > w + 80 || m.y > h + 80) {
          meteors[i] = createMeteor(w, h);
          continue;
        }

        const meteorRenderY = ((m.y - smoothedScrollY * 0.4) % h + h) % h;

        ctx.save();
        ctx.globalAlpha = Math.max(0, m.alpha);

        const tailX = m.x - Math.cos(m.angle) * m.length;
        const tailY = meteorRenderY - Math.sin(m.angle) * m.length;

        const mGrad = ctx.createLinearGradient(m.x, meteorRenderY, tailX, tailY);
        mGrad.addColorStop(0, "rgba(255, 255, 255, 1)");
        mGrad.addColorStop(0.25, "rgba(253, 230, 138, 0.8)");
        mGrad.addColorStop(0.7, "rgba(192, 132, 252, 0.4)");
        mGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.strokeStyle = mGrad;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(m.x, meteorRenderY);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        // Meteor Head Spark
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(m.x, meteorRenderY, 2.0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // 3. COMPOSITE MASK: Clip the cosmos STRICTLY INSIDE the letters/shape of TETRA HATS
      ctx.globalCompositeOperation = "destination-in";
      drawBrandShape(ctx, w, h, false);

      // 4. CRISP OUTLINE & AMBIENT STROKE (Drawn over the clipped cosmos)
      ctx.globalCompositeOperation = "source-over";
      drawBrandShape(ctx, w, h, true);

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    let lastWidth = 0;
    let resizeRafId: number | null = null;

    const updateDimensions = (containerWidth: number) => {
      const roundedWidth = Math.round(containerWidth);
      if (Math.abs(roundedWidth - lastWidth) < 2 && lastWidth !== 0) {
        return;
      }
      lastWidth = roundedWidth;

      dpr = Math.min(window.devicePixelRatio || 1, 2);

      cssWidth = Math.max(280, roundedWidth);
      // Balanced aspect ratio ~ 3.3:1
      cssHeight = Math.max(120, Math.min(270, Math.round(cssWidth * 0.28)));

      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;

      initCosmos(cssWidth, cssHeight);
      
      // Render first frame immediately
      render();
      setIsRendered(true);
    };

    // Calculate initial container width accurately
    const getInitialWidth = () => {
      if (container) {
        const rect = container.getBoundingClientRect();
        if (rect.width > 0) return rect.width;
        if (container.clientWidth > 0) return container.clientWidth;
      }
      if (typeof window !== "undefined") {
        return Math.min(window.innerWidth - 32, 900);
      }
      return 600;
    };

    updateDimensions(getInitialWidth());

    // Robust ResizeObserver for zero-flicker adaptive scaling using requestAnimationFrame
    const resizeObserver = new ResizeObserver((entries) => {
      if (!Array.isArray(entries) || entries.length === 0) return;
      const width = entries[0].contentRect.width;
      if (width <= 0) return;

      if (resizeRafId !== null) {
        cancelAnimationFrame(resizeRafId);
      }
      resizeRafId = requestAnimationFrame(() => {
        updateDimensions(width);
      });
    });

    resizeObserver.observe(container);

    return () => {
      if (resizeRafId !== null) {
        cancelAnimationFrame(resizeRafId);
      }
      resizeObserver.disconnect();
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, [glowColor, glowMode, customImage]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full max-w-full flex items-center justify-center select-none group/cosmic-logo transition-transform duration-500 hover:scale-[1.01] ${className}`}
      id="hero-cosmic-logo"
      style={{ minHeight: "120px" }}
    >
      {/* Outer ambient glow halo when glowMode is on or hovered */}
      <div 
        className="absolute inset-0 pointer-events-none rounded-full blur-3xl opacity-40 transition-opacity duration-700 group-hover/cosmic-logo:opacity-75"
        style={{
          background: `radial-gradient(ellipse at center, ${glowColor}50 0%, rgba(255,255,255,0.15) 45%, transparent 75%)`
        }}
        aria-hidden="true"
      />

      {/* Main Cosmic Canvas Rendering with smooth transition */}
      <canvas
        ref={canvasRef}
        className={`relative z-10 block max-w-full h-auto drop-shadow-[0_8px_36px_rgba(0,0,0,0.9)] filter transition-opacity duration-500 ease-out ${
          isRendered ? "opacity-100" : "opacity-0"
        }`}
        aria-label={alt}
      />
    </div>
  );
}
