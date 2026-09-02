"use client";

import { useEffect, useRef } from "react";

type Square = {
  phase: number;
  speed: number;
  brightness: number;
};

type Props = {
  gridSize?: number;
  squareSize?: number;
  fadeStart?: number;
  fadeEnd?: number;
  falloff?: number;
  minBrightness?: number;
  twinkleSpeed?: number;
  twinkleStrength?: number;
  intensity?: number;
  opacity?: number;
};

// Adapted from the React Bits Pro Blinking Squares background for Yamu's index grid.
// The public component controls are preserved, with theme colors read from CSS tokens.
export function BlinkingSquares({
  gridSize = 52,
  squareSize = 0.38,
  fadeStart = 0.44,
  fadeEnd = 1,
  falloff = 1.6,
  minBrightness = 0.42,
  twinkleSpeed = 0.45,
  twinkleStrength = 0.32,
  intensity = 0.72,
  opacity = 0.16,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasElement = canvasRef.current as HTMLCanvasElement;
    if (!canvasElement) return;
    const context = canvasElement.getContext("2d") as CanvasRenderingContext2D;
    if (!context) return;

    let frame = 0;
    let width = 0;
    let height = 0;
    let columns = 0;
    let rows = 0;
    let cell = 0;
    let squares: Square[] = [];
    let squareColor = "255, 79, 31";
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function readColor() {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--index-background-rgb")
        .trim();
      squareColor = raw || "255, 79, 31";
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvasElement.width = Math.round(width * dpr);
      canvasElement.height = Math.round(height * dpr);
      canvasElement.style.width = `${width}px`;
      canvasElement.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      cell = Math.max(18, Math.max(width, height) / gridSize);
      columns = Math.ceil(width / cell) + 1;
      rows = Math.ceil(height / cell) + 1;
      squares = Array.from({ length: columns * rows }, (_, index) => ({
        phase: ((index * 47) % 101) / 101 * Math.PI * 2,
        speed: 0.72 + ((index * 29) % 37) / 100,
        brightness: minBrightness + ((index * 17) % 41) / 100 * (1 - minBrightness),
      }));
      readColor();
      if (reduceMotion.matches) draw(0);
    }

    function draw(time: number) {
      context.clearRect(0, 0, width, height);
      const size = cell * squareSize;
      const motionTime = reduceMotion.matches ? 0 : time / 1000;

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const progress = columns <= 1 ? 1 : column / (columns - 1);
          if (progress <= fadeStart) continue;
          const normalized = Math.min(1, (progress - fadeStart) / Math.max(0.001, fadeEnd - fadeStart));
          const density = Math.pow(normalized, falloff);
          const square = squares[row * columns + column];
          const threshold = ((row * 31 + column * 17) % 100) / 100;
          if (threshold > density) continue;

          const shimmer = 1 - twinkleStrength / 2
            + Math.sin(square.phase + motionTime * twinkleSpeed * square.speed * Math.PI * 2) * twinkleStrength / 2;
          const alpha = opacity * intensity * square.brightness * shimmer * density;
          context.fillStyle = `rgba(${squareColor}, ${Math.max(0, alpha)})`;
          context.fillRect(
            column * cell + (cell - size) / 2,
            row * cell + (cell - size) / 2,
            size,
            size,
          );
        }
      }

      if (!reduceMotion.matches) {
        frame = window.requestAnimationFrame(draw);
      }
    }

    function handleMotionPreference() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(draw);
    }

    const observer = new MutationObserver(readColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "style"] });
    window.addEventListener("resize", resize);
    reduceMotion.addEventListener("change", handleMotionPreference);
    resize();
    frame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      reduceMotion.removeEventListener("change", handleMotionPreference);
      observer.disconnect();
    };
  }, [fadeEnd, fadeStart, falloff, gridSize, intensity, minBrightness, opacity, squareSize, twinkleSpeed, twinkleStrength]);

  return <canvas ref={canvasRef} className="reactbits-background" aria-hidden="true" />;
}
