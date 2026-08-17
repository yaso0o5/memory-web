/* The Field of Traces — drifting dust on canvas.
   Touch disturbs it; dragging draws glowing strokes the site counts.
   Density grows with the relationship stage. */

import { useEffect, useRef } from "react";

interface Props {
  stage: number;
  sat: number;
  hue: number;
  inkRgb: string; // "r,g,b" of the theme's ink
  onStrokes: (n: number) => void;
}

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  tw: number; // twinkle phase
}

interface Spark {
  x: number;
  y: number;
  life: number;
}

export default function ParticleField({ stage, sat, hue, inkRgb, onStrokes }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const propsRef = useRef({ stage, sat, hue, inkRgb, onStrokes });
  propsRef.current = { stage, sat, hue, inkRgb, onStrokes };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0;
    let H = 0;
    let raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const particles: P[] = [];
    const sparks: Spark[] = [];
    const pointer = { x: -9999, y: -9999, down: false, px: 0, py: 0, dist: 0, batch: 0 };

    const count = () => Math.min(130, 30 + propsRef.current.stage * 24);

    const seed = () => {
      particles.length = 0;
      const n = count();
      for (let i = 0; i < n; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.12,
          r: 0.6 + Math.random() * 1.7,
          tw: Math.random() * Math.PI * 2,
        });
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (reduced) drawFrame(0, true);
    };

    const drawFrame = (t: number, still = false) => {
      const { sat, hue, inkRgb, stage } = propsRef.current;
      ctx.clearRect(0, 0, W, H);
      const colored = sat > 4;
      const linkDist = stage >= 1 ? 64 : 0;

      // constellation lines
      if (linkDist > 0 && !still) {
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const a = particles[i];
            const b = particles[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < linkDist * linkDist) {
              const al = (1 - Math.sqrt(d2) / linkDist) * 0.09;
              ctx.strokeStyle = colored
                ? `hsla(${hue}, ${sat}%, 64%, ${al})`
                : `rgba(${inkRgb}, ${al})`;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
      }

      // dust
      for (const p of particles) {
        const twk = still ? 0.7 : 0.45 + 0.55 * Math.abs(Math.sin(t / 1400 + p.tw));
        ctx.fillStyle = colored
          ? `hsla(${hue}, ${sat}%, 70%, ${0.5 * twk})`
          : `rgba(${inkRgb}, ${0.5 * twk})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // drawn sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= still ? 1 : 0.018;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.fillStyle = colored
          ? `hsla(${hue}, ${Math.max(40, sat)}%, 68%, ${s.life * 0.8})`
          : `rgba(${inkRgb}, ${s.life * 0.8})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.6 * s.life + 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const step = (t: number) => {
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        // gentle repulsion from the finger
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 90 * 90 && d2 > 0.01) {
          const f = (90 - Math.sqrt(d2)) / 90;
          p.x += (dx / Math.sqrt(d2)) * f * 1.4;
          p.y += (dy / Math.sqrt(d2)) * f * 1.4;
        }
        if (p.x < -8) p.x = W + 8;
        if (p.x > W + 8) p.x = -8;
        if (p.y < -8) p.y = H + 8;
        if (p.y > H + 8) p.y = -8;
      }
      drawFrame(t);
      raf = requestAnimationFrame(step);
    };

    /* pointer — disturb + draw + count strokes */
    const toLocal = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onDown = (e: PointerEvent) => {
      const p = toLocal(e);
      pointer.down = true;
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.px = p.x;
      pointer.py = p.y;
      pointer.dist = 0;
    };

    const onMove = (e: PointerEvent) => {
      const p = toLocal(e);
      pointer.x = p.x;
      pointer.y = p.y;
      if (pointer.down) {
        const dx = p.x - pointer.px;
        const dy = p.y - pointer.py;
        pointer.dist += Math.hypot(dx, dy);
        if (sparks.length < 220) sparks.push({ x: p.x, y: p.y, life: 1 });
        while (pointer.dist >= 60) {
          pointer.dist -= 60;
          pointer.batch += 1;
          if (pointer.batch >= 4) {
            propsRef.current.onStrokes(pointer.batch);
            pointer.batch = 0;
          }
        }
        pointer.px = p.x;
        pointer.py = p.y;
      }
    };

    const onUp = () => {
      pointer.down = false;
      pointer.x = -9999;
      pointer.y = -9999;
      if (pointer.batch > 0) {
        propsRef.current.onStrokes(pointer.batch);
        pointer.batch = 0;
      }
    };

    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    if (!reduced) raf = requestAnimationFrame(step);
    else drawFrame(0, true);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ touchAction: "pan-y" }}
      aria-label="the field of traces — touch to disturb the dust, drag to draw"
    />
  );
}
