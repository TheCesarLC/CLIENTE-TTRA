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
      const starCount = Math.max(220, Math.floor((w * h) / 450));

      for (let i = 0; i < starCount; i++) {
        const layerRand = Math.random();
        let layer = 0;
        let radius = Math.random() * 1.3 + 0.6;
        let parallaxSpeed = 0.22;

        if (layerRand > 0.55 && layerRand <= 0.85) {
          layer = 1;
          radius = Math.random() * 2.0 + 1.2;
          parallaxSpeed = 0.52;
        } else if (layerRand > 0.85) {
          layer = 2;
          radius = Math.random() * 3.2 + 1.8;
          parallaxSpeed = 0.95;
        }

        const hasFlare = (layer === 2 || radius > 2.2) && Math.random() < 0.5;

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
        createMeteor(w, h, 60),
        createMeteor(w, h, 120),
        createMeteor(w, h, 180),
        createMeteor(w, h, 240)
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

      // Detect letterSpacing support in canvas
      let hasNativeLetterSpacing = false;
      try {
        if ("letterSpacing" in context) {
          hasNativeLetterSpacing = true;
        }
      } catch {
        hasNativeLetterSpacing = false;
      }

      const text = hasNativeLetterSpacing ? "TETRA HATS" : "T E T R A   H A T S";
      const subText = hasNativeLetterSpacing ? "EXCLUSIVE COLLECTION" : "E X C L U S I V E   C O L L E C T I O N";

      // 2X Expanded Scale Typography
      let baseFontSize = Math.max(90, Math.min(180, Math.round(w * 0.13)));
      context.font = `900 ${baseFontSize}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      if (hasNativeLetterSpacing) {
        (context as any).letterSpacing = `${Math.round(baseFontSize * 0.22)}px`;
      }
      
      const measuredWidth = context.measureText(text).width;
      if (measuredWidth > w * 0.95) {
        baseFontSize = Math.floor(baseFontSize * ((w * 0.95) / measuredWidth));
        context.font = `900 ${baseFontSize}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        if (hasNativeLetterSpacing) {
          (context as any).letterSpacing = `${Math.round(baseFontSize * 0.22)}px`;
        }
      }

      // 2X Expanded Crown Emblem: Majestic, bold & grand scale
      const emblemSize = Math.max(120, Math.min(240, Math.round(baseFontSize * 1.35)));
      const emblemBoxH = emblemSize * 1.3;

      // 2X Expanded Subtitle
      let subFontSize = Math.max(22, Math.min(42, Math.round(baseFontSize * 0.24)));
      context.font = `800 ${subFontSize}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      if (hasNativeLetterSpacing) {
        (context as any).letterSpacing = `${Math.round(subFontSize * 0.22)}px`;
      }
      const subMeasuredWidth = context.measureText(subText).width;
      if (subMeasuredWidth > w * 0.90) {
        subFontSize = Math.floor(subFontSize * ((w * 0.90) / subMeasuredWidth));
        context.font = `800 ${subFontSize}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        if (hasNativeLetterSpacing) {
          (context as any).letterSpacing = `${Math.round(subFontSize * 0.22)}px`;
        }
      }

      // Proportional, tight gaps between elements (no wasted vertical frames)
      const gap1 = Math.max(14, Math.round(baseFontSize * 0.14));
      const gap2 = Math.max(14, Math.round(baseFontSize * 0.16));
      const textBoxH = baseFontSize * 0.85;
      const subBoxH = subFontSize * 0.85;
      const totalLockupH = emblemBoxH + gap1 + textBoxH + gap2 + subBoxH;

      // Center the 2X lockup neatly inside available canvas height
      const startY = Math.max(10, (h - totalLockupH) / 2);
      const emblemY = startY + (emblemBoxH / 2);
      const textY = startY + emblemBoxH + gap1 + (textBoxH / 2);
      const subY = startY + emblemBoxH + gap1 + textBoxH + gap2 + (subBoxH / 2);

      // 1. Geometric TH Crown Emblem (2X Grand Scale Luxury Design)
      context.save();
      context.translate(w / 2, emblemY);

      if (isOutline) {
        context.strokeStyle = "rgba(255, 255, 255, 0.98)";
        context.lineWidth = 5.2;
        context.beginPath();
        context.roundRect(-emblemSize * 0.65, -emblemSize * 0.65, emblemSize * 1.3, emblemSize * 1.3, 24);
        context.stroke();

        // Elegant geometric crown crest inner outline
        context.lineWidth = 4.0;
        context.strokeStyle = glowColor || "#10b981";
        context.beginPath();
        const cw = emblemSize * 0.45;
        const ch = emblemSize * 0.32;
        context.moveTo(-cw, ch * 0.4);
        context.lineTo(-cw * 0.6, -ch);
        context.lineTo(0, -ch * 0.2);
        context.lineTo(cw * 0.6, -ch);
        context.lineTo(cw, ch * 0.4);
        context.closePath();
        context.stroke();
      } else {
        context.fillStyle = "#FFFFFF";
        context.beginPath();
        context.roundRect(-emblemSize * 0.65, -emblemSize * 0.65, emblemSize * 1.3, emblemSize * 1.3, 24);
        context.fill();

        // Inverted crown crest cutout
        context.fillStyle = "#000000";
        context.beginPath();
        const cw = emblemSize * 0.45;
        const ch = emblemSize * 0.32;
        context.moveTo(-cw, ch * 0.4);
        context.lineTo(-cw * 0.6, -ch);
        context.lineTo(0, -ch * 0.2);
        context.lineTo(cw * 0.6, -ch);
        context.lineTo(cw, ch * 0.4);
        context.closePath();
        context.fill();
      }
      context.restore();

      // 2. Main Title "TETRA HATS" - 2X Bold Scale Font
      context.font = `900 ${baseFontSize}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      if (hasNativeLetterSpacing) {
        (context as any).letterSpacing = `${Math.round(baseFontSize * 0.22)}px`;
      }
      if (isOutline) {
        context.strokeStyle = "rgba(255, 255, 255, 0.98)";
        context.lineWidth = Math.max(4.0, baseFontSize * 0.045);
        context.strokeText(text, w / 2, textY);
      } else {
        context.fillStyle = "#FFFFFF";
        context.fillText(text, w / 2, textY);
      }

      // 3. Subtitle "EXCLUSIVE COLLECTION" - 2X Bold Scale
      context.font = `800 ${subFontSize}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      if (hasNativeLetterSpacing) {
        (context as any).letterSpacing = `${Math.round(subFontSize * 0.22)}px`;
      }
      if (isOutline) {
        context.strokeStyle = glowColor || "#10b981";
        context.lineWidth = 3.2;
        context.strokeText(subText, w / 2, subY);

        // Accent divider lines
        const subMetrics = context.measureText(subText);
        const lineLen = Math.max(50, Math.min(140, w * 0.12));
        const lineY = subY;

        context.strokeStyle = "rgba(255, 255, 255, 0.85)";
        context.lineWidth = 3.5;

        // Left line
        context.beginPath();
        context.moveTo(w / 2 - subMetrics.width / 2 - lineLen - 24, lineY);
        context.lineTo(w / 2 - subMetrics.width / 2 - 24, lineY);
        context.stroke();

        // Right line
        context.beginPath();
        context.moveTo(w / 2 + subMetrics.width / 2 + 24, lineY);
        context.lineTo(w / 2 + subMetrics.width / 2 + lineLen + 24, lineY);
        context.stroke();
      } else {
        context.fillStyle = "#FFFFFF";
        context.fillText(subText, w / 2, subY);

        const subMetrics = context.measureText(subText);
        const lineLen = Math.max(50, Math.min(140, w * 0.12));
        const lineY = subY;

        context.fillRect(w / 2 - subMetrics.width / 2 - lineLen - 24, lineY - 3, lineLen, 6);
        context.fillRect(w / 2 + subMetrics.width / 2 + 24, lineY - 3, lineLen, 6);
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
      
      if (customImage && customImage.complete && customImage.naturalWidth > 0) {
        const aspect = customImage.naturalWidth / customImage.naturalHeight;
        cssHeight = Math.max(240, Math.min(650, Math.round(cssWidth / aspect)));
      } else {
        // Grand Scale 2X lockup height matching expanded crown emblem and typography
        const estBaseFont = Math.max(90, Math.min(180, Math.round(cssWidth * 0.13)));
        const estEmblemSize = Math.max(120, Math.min(240, Math.round(estBaseFont * 1.35)));
        const estEmblemBoxH = estEmblemSize * 1.3;
        const estTextBoxH = estBaseFont * 0.85;
        const estSubFont = Math.max(22, Math.min(42, Math.round(estBaseFont * 0.24)));
        const estSubBoxH = estSubFont * 0.85;
        const estGap1 = Math.max(14, Math.round(estBaseFont * 0.14));
        const estGap2 = Math.max(14, Math.round(estBaseFont * 0.16));
        const estTotalH = estEmblemBoxH + estGap1 + estTextBoxH + estGap2 + estSubBoxH;
        cssHeight = Math.max(240, Math.round(estTotalH + 24));
      }

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
        return Math.min(window.innerWidth - 24, 1400);
      }
      return 1100;
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
    >
      {/* Outer ambient glow halo when glowMode is on or hovered */}
      <div 
        className="absolute inset-0 pointer-events-none rounded-full blur-3xl opacity-50 transition-opacity duration-700 group-hover/cosmic-logo:opacity-85"
        style={{
          background: `radial-gradient(ellipse at center, ${glowColor}60 0%, rgba(255,255,255,0.2) 40%, transparent 75%)`
        }}
        aria-hidden="true"
      />

      {/* Main Cosmic Canvas Rendering with smooth transition */}
      <canvas
        ref={canvasRef}
        className={`relative z-10 block max-w-full h-auto drop-shadow-[0_12px_48px_rgba(0,0,0,0.95)] filter transition-opacity duration-500 ease-out ${
          isRendered ? "opacity-100" : "opacity-0"
        }`}
        aria-label={alt}
      />
    </div>
  );
}
