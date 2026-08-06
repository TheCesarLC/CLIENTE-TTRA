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

    // Star Colors for realistic night sky (white, subtle ice blue, warm starlight, pale gold)
    const starColors = [
      "#FFFFFF",
      "#FFFFFF",
      "#FFFFFF",
      "#E0F2FE", // Ice blue
      "#FDE68A", // Soft gold
      "#F472B6", // Ultra subtle rose tint
      "#C084FC"  // Subtle violet
    ];

    let stars: Star[] = [];
    let meteors: Meteor[] = [];

    function initStars() {
      stars = [];
      // Scale star count by screen area so mobile is light and desktop is crisp
      const starDensity = Math.floor((width * height) / 4500);
      const starCount = Math.min(Math.max(starDensity, 120), 280);

      for (let i = 0; i < starCount; i++) {
        const radius = Math.random() < 0.85 
          ? Math.random() * 1.2 + 0.3  // 85% tiny background stars
          : Math.random() * 1.8 + 1.2; // 15% brighter, larger stars

        const hasFlare = radius > 2.0 && Math.random() < 0.35;

        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius,
          baseAlpha: Math.random() * 0.6 + 0.35,
          alpha: Math.random(),
          twinkleSpeed: Math.random() * 0.02 + 0.005,
          twinklePhase: Math.random() * Math.PI * 2,
          color: starColors[Math.floor(Math.random() * starColors.length)],
          hasFlare
        });
      }

      // Initialize 3 meteors with staggered delays
      meteors = [
        createMeteor(0),
        createMeteor(180),
        createMeteor(360)
      ];
    }

    function createMeteor(initialDelay: number = 0): Meteor {
      return {
        x: Math.random() * width * 1.2 - width * 0.1,
        y: Math.random() * (height * 0.4),
        length: Math.random() * 80 + 60,
        speed: Math.random() * 12 + 10,
        angle: Math.PI / 4 + (Math.random() * 0.2 - 0.1), // ~45 degree angle
        alpha: 0,
        active: false,
        delay: initialDelay || Math.floor(Math.random() * 300 + 200)
      };
    }

    initStars();

    let time = 0;

    const render = () => {
      time += 1;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw subtle cosmic gradient background depth
      const deepGradient = ctx.createRadialGradient(
        width * 0.5,
        height * 0.3,
        50,
        width * 0.5,
        height * 0.5,
        Math.max(width, height)
      );
      deepGradient.addColorStop(0, "rgba(8, 12, 24, 0.4)");
      deepGradient.addColorStop(0.5, "rgba(3, 5, 12, 0.7)");
      deepGradient.addColorStop(1, "rgba(0, 0, 0, 0.95)");

      ctx.fillStyle = deepGradient;
      ctx.fillRect(0, 0, width, height);

      // 2. Render stars
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        // Twinkle calculation
        star.twinklePhase += star.twinkleSpeed;
        const currentAlpha = Math.max(
          0.1,
          star.baseAlpha + Math.sin(star.twinklePhase) * 0.35
        );

        ctx.save();
        ctx.globalAlpha = currentAlpha;
        ctx.fillStyle = star.color;

        // Draw star core
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw soft glow for larger stars
        if (star.radius > 1.2) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = star.color;
          ctx.globalAlpha = currentAlpha * 0.18;
          ctx.fill();
        }

        // Draw 4-point flare for rare focal stars
        if (star.hasFlare && currentAlpha > 0.5) {
          ctx.strokeStyle = star.color;
          ctx.lineWidth = 0.6;
          ctx.globalAlpha = currentAlpha * 0.5;

          const flareLen = star.radius * 4;

          ctx.beginPath();
          // Horizontal cross ray
          ctx.moveTo(star.x - flareLen, star.y);
          ctx.lineTo(star.x + flareLen, star.y);
          // Vertical cross ray
          ctx.moveTo(star.x, star.y - flareLen);
          ctx.lineTo(star.x, star.y + flareLen);
          ctx.stroke();
        }

        ctx.restore();
      }

      // 3. Render Shooting Stars / Meteors
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
        m.alpha -= 0.012; // Smooth fade out

        if (m.alpha <= 0 || m.x > width + 100 || m.y > height + 100) {
          meteors[i] = createMeteor();
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, m.alpha);

        // Tail gradient
        const tailX = m.x - Math.cos(m.angle) * m.length;
        const tailY = m.y - Math.sin(m.angle) * m.length;

        const meteorGradient = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
        meteorGradient.addColorStop(0, "rgba(255, 255, 255, 0.95)");
        meteorGradient.addColorStop(0.3, "rgba(224, 242, 254, 0.5)");
        meteorGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.strokeStyle = meteorGradient;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        // Head glow
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(m.x, m.y, 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black select-none">
      {/* Background Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Subtle cosmic radial nebula overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen"
        style={{
          background: "radial-gradient(circle at 50% 20%, rgba(16, 185, 129, 0.08) 0%, transparent 60%), radial-gradient(circle at 80% 70%, rgba(120, 119, 198, 0.06) 0%, transparent 50%)"
        }}
      />
    </div>
  );
}
