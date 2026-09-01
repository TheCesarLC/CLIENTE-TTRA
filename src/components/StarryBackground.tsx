import React, { useEffect, useRef } from "react";

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
  layer: number; // 0 = distant, 1 = mid, 2 = foreground
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

export default function StarryBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initStars();
    };

    window.addEventListener("resize", handleResize);

    // Dynamic Star Colors for realistic luxury cosmos
    const starColors = [
      "#FFFFFF",
      "#FFFFFF",
      "#FFFFFF",
      "#F8FAFC",
      "#E0F2FE", // Ice diamond blue
      "#FDE68A", // Celestial gold
      "#F472B6", // Starlight rose
      "#C084FC", // Cosmic violet
      "#34D399"  // Emerald starlight
    ];

    let stars: Star[] = [];
    let meteors: Meteor[] = [];

    function initStars() {
      stars = [];
      // Rich density scaled to screen dimensions
      const starDensity = Math.floor((width * height) / 3200);
      const starCount = Math.min(Math.max(starDensity, 160), 380);

      for (let i = 0; i < starCount; i++) {
        // Multi-depth layer distribution
        const layerRand = Math.random();
        let layer = 0;
        let radius = Math.random() * 0.9 + 0.4;
        let parallaxSpeed = 0.15; // Distant background

        if (layerRand > 0.65 && layerRand <= 0.9) {
          layer = 1; // Midground
          radius = Math.random() * 1.4 + 0.9;
          parallaxSpeed = 0.38 + Math.random() * 0.2;
        } else if (layerRand > 0.9) {
          layer = 2; // Foreground high-speed parallax
          radius = Math.random() * 2.2 + 1.4;
          parallaxSpeed = 0.75 + Math.random() * 0.45;
        }

        const hasFlare = (layer === 2 || radius > 1.8) && Math.random() < 0.45;

        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius,
          baseAlpha: layer === 2 ? Math.random() * 0.35 + 0.65 : Math.random() * 0.5 + 0.35,
          alpha: Math.random(),
          twinkleSpeed: Math.random() * 0.025 + 0.008,
          twinklePhase: Math.random() * Math.PI * 2,
          color: starColors[Math.floor(Math.random() * starColors.length)],
          hasFlare,
          parallaxSpeed,
          layer
        });
      }

      // Initialize 4 meteors
      meteors = [
        createMeteor(0),
        createMeteor(120),
        createMeteor(240),
        createMeteor(360)
      ];
    }

    function createMeteor(initialDelay: number = 0): Meteor {
      return {
        x: Math.random() * width * 1.3 - width * 0.15,
        y: Math.random() * (height * 0.45),
        length: Math.random() * 90 + 70,
        speed: Math.random() * 14 + 10,
        angle: Math.PI / 4.2 + (Math.random() * 0.16 - 0.08),
        alpha: 0,
        active: false,
        delay: initialDelay || Math.floor(Math.random() * 260 + 100)
      };
    }

    initStars();

    let targetScrollY = typeof window !== "undefined" ? window.scrollY : 0;
    let smoothedScrollY = targetScrollY;
    let scrollVelocity = 0;
    let lastScrollY = targetScrollY;

    const handleScroll = () => {
      targetScrollY = window.scrollY;
      scrollVelocity = Math.abs(targetScrollY - lastScrollY);
      lastScrollY = targetScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    let time = 0;

    const render = () => {
      time += 0.01;
      
      // Responsive smooth parallax tracking
      const scrollDiff = targetScrollY - smoothedScrollY;
      smoothedScrollY += scrollDiff * 0.14;

      ctx.clearRect(0, 0, width, height);

      // 1. Dynamic Deep Space Gradient with subtle cosmic color shifts
      const deepGradient = ctx.createRadialGradient(
        width * 0.5,
        height * 0.35,
        40,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.85
      );
      deepGradient.addColorStop(0, "rgba(8, 14, 28, 0.45)");
      deepGradient.addColorStop(0.5, "rgba(3, 6, 14, 0.75)");
      deepGradient.addColorStop(1, "rgba(0, 0, 0, 0.96)");

      ctx.fillStyle = deepGradient;
      ctx.fillRect(0, 0, width, height);

      // 2. Render Stars with High-Fidelity Depth Parallax
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        // Twinkle calculation
        star.twinklePhase += star.twinkleSpeed;
        const currentAlpha = Math.max(
          0.12,
          star.baseAlpha + Math.sin(star.twinklePhase) * 0.38
        );

        // Seamless vertical wrapping with depth-scaled scroll displacement
        const starRenderY = ((star.y - smoothedScrollY * star.parallaxSpeed) % height + height) % height;

        ctx.save();
        ctx.globalAlpha = Math.min(1, currentAlpha);
        ctx.fillStyle = star.color;

        // Draw star core pinpoint
        ctx.beginPath();
        ctx.arc(star.x, starRenderY, star.radius, 0, Math.PI * 2);
        ctx.fill();

        // Soft halo for mid & foreground stars
        if (star.radius > 1.1) {
          ctx.beginPath();
          ctx.arc(star.x, starRenderY, star.radius * 2.4, 0, Math.PI * 2);
          ctx.fillStyle = star.color;
          ctx.globalAlpha = currentAlpha * 0.28;
          ctx.fill();
        }

        // Diamond 4-point Flare on prominent bright stars
        if (star.hasFlare && currentAlpha > 0.5) {
          ctx.strokeStyle = star.color;
          ctx.lineWidth = star.layer === 2 ? 1.0 : 0.6;
          ctx.globalAlpha = currentAlpha * 0.6;

          const flareLen = star.radius * 4.2;

          ctx.beginPath();
          // Horizontal cross ray
          ctx.moveTo(star.x - flareLen, starRenderY);
          ctx.lineTo(star.x + flareLen, starRenderY);
          // Vertical cross ray
          ctx.moveTo(star.x, starRenderY - flareLen);
          ctx.lineTo(star.x, starRenderY + flareLen);
          ctx.stroke();

          // Subtle center sparkle point
          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.arc(star.x, starRenderY, star.radius * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // 3. Render Shooting Stars / Meteors with Scroll Energy
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

        // Move meteor
        m.x += Math.cos(m.angle) * m.speed;
        m.y += Math.sin(m.angle) * m.speed;
        m.alpha -= 0.014;

        if (m.alpha <= 0 || m.x > width + 120 || m.y > height + 120) {
          meteors[i] = createMeteor();
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, m.alpha);

        // Tail gradient
        const tailX = m.x - Math.cos(m.angle) * m.length;
        const tailY = m.y - Math.sin(m.angle) * m.length;

        const meteorGradient = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
        meteorGradient.addColorStop(0, "rgba(255, 255, 255, 1)");
        meteorGradient.addColorStop(0.2, "rgba(253, 230, 138, 0.75)");
        meteorGradient.addColorStop(0.6, "rgba(192, 132, 252, 0.35)");
        meteorGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.strokeStyle = meteorGradient;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        // Head glow
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(m.x, m.y, 1.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black select-none">
      {/* Background Canvas with high visual depth */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Subtle cosmic radial nebula overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-45 mix-blend-screen"
        style={{
          background: "radial-gradient(circle at 50% 15%, rgba(16, 185, 129, 0.12) 0%, transparent 65%), radial-gradient(circle at 80% 70%, rgba(120, 119, 198, 0.08) 0%, transparent 50%)"
        }}
      />
    </div>
  );
}
