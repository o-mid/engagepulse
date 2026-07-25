"use client";

import { useEffect, useRef } from "react";

type Pulse = {
  x: number;
  y: number;
  r: number;
  max: number;
  life: number;
  hue: "acme" | "nova";
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  hue: "acme" | "nova";
  size: number;
};

type Orb = {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  phase: number;
  hue: "acme" | "nova";
  r: number;
};

export type PulseFieldHandle = {
  burst: (side: "acme" | "nova", intensity?: number) => void;
};

type Props = {
  running: boolean;
  onReady?: (api: PulseFieldHandle) => void;
};

export function PulseField({ running, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runningRef = useRef(running);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const pulses: Pulse[] = [];
    const particles: Particle[] = [];
    const orbs: Orb[] = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (orbs.length === 0) {
        for (let i = 0; i < 18; i++) {
          const hue = i % 2 === 0 ? "acme" : "nova";
          const baseX = hue === "acme" ? w * (0.12 + Math.random() * 0.28) : w * (0.58 + Math.random() * 0.28);
          const baseY = h * (0.25 + Math.random() * 0.5);
          orbs.push({
            x: baseX,
            y: baseY,
            baseX,
            baseY,
            phase: Math.random() * Math.PI * 2,
            hue,
            r: 1.2 + Math.random() * 2.2,
          });
        }
      }
    };
    resize();
    window.addEventListener("resize", resize);

    const burst = (side: "acme" | "nova", intensity = 1) => {
      const x = side === "acme" ? w * 0.28 : w * 0.72;
      const y = h * 0.52;
      pulses.push({
        x,
        y,
        r: 10,
        max: 200 + intensity * 110,
        life: 1,
        hue: side,
      });
      const n = 14 + Math.floor(intensity * 12);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 0.7 + Math.random() * 2.8 * intensity;
        particles.push({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s - 0.5,
          life: 1,
          hue: side,
          size: 1 + Math.random() * 2,
        });
      }
    };

    onReadyRef.current?.({ burst });

    let t = 0;
    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);

      const g1 = ctx.createRadialGradient(w * 0.28, h * 0.52, 0, w * 0.28, h * 0.52, w * 0.38);
      g1.addColorStop(0, "rgba(232,168,124,0.14)");
      g1.addColorStop(1, "rgba(232,168,124,0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      const g2 = ctx.createRadialGradient(w * 0.72, h * 0.52, 0, w * 0.72, h * 0.52, w * 0.38);
      g2.addColorStop(0, "rgba(45,212,191,0.13)");
      g2.addColorStop(1, "rgba(45,212,191,0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);

      // constellation orbs
      for (const o of orbs) {
        o.x = o.baseX + Math.sin(t * 0.7 + o.phase) * 10;
        o.y = o.baseY + Math.cos(t * 0.55 + o.phase) * 8;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fillStyle =
          o.hue === "acme"
            ? `rgba(240,194,127,${0.25 + Math.sin(t + o.phase) * 0.12})`
            : `rgba(125,211,252,${0.22 + Math.cos(t + o.phase) * 0.12})`;
        ctx.fill();
      }

      // faint links between nearby orbs
      ctx.lineWidth = 0.6;
      for (let i = 0; i < orbs.length; i++) {
        for (let j = i + 1; j < orbs.length; j++) {
          const a = orbs[i];
          const b = orbs[j];
          if (a.hue !== b.hue) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d > 120) continue;
          ctx.strokeStyle =
            a.hue === "acme"
              ? `rgba(232,168,124,${0.08 * (1 - d / 120)})`
              : `rgba(45,212,191,${0.08 * (1 - d / 120)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      if (runningRef.current && Math.random() < 0.03) {
        burst(Math.random() > 0.5 ? "acme" : "nova", 0.3);
      }

      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.r += 2.4;
        p.life -= 0.011;
        const alpha = Math.max(p.life, 0);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.strokeStyle =
          p.hue === "acme"
            ? `rgba(240,194,127,${alpha * 0.55})`
            : `rgba(125,211,252,${alpha * 0.55})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 0.72, 0, Math.PI * 2);
        ctx.strokeStyle =
          p.hue === "acme"
            ? `rgba(255,107,74,${alpha * 0.2})`
            : `rgba(45,212,191,${alpha * 0.2})`;
        ctx.stroke();
        if (p.life <= 0 || p.r > p.max) pulses.splice(i, 1);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.012;
        p.life -= 0.015;
        ctx.fillStyle =
          p.hue === "acme"
            ? `rgba(255,107,74,${Math.max(p.life, 0)})`
            : `rgba(45,212,191,${Math.max(p.life, 0)})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        if (p.life <= 0) particles.splice(i, 1);
      }

      const seam = ctx.createLinearGradient(w * 0.5, 0, w * 0.5, h);
      seam.addColorStop(0, "rgba(245,239,230,0)");
      seam.addColorStop(0.5, "rgba(245,239,230,0.14)");
      seam.addColorStop(1, "rgba(245,239,230,0)");
      ctx.fillStyle = seam;
      ctx.fillRect(w * 0.5 - 0.5, 0, 1, h);

      ctx.strokeStyle = "rgba(245,239,230,0.045)";
      ctx.beginPath();
      for (let x = 0; x < w; x += 24) {
        const y = h * 0.8 + Math.sin(x * 0.02 + t) * 5;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
