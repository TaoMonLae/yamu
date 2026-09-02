"use client";

import { useLayoutEffect, useRef } from "react";

type Props = {
  value: string;
  className?: string;
  containerClassName?: string;
};

export function FitText({ value, className = "", containerClassName = "" }: Props) {
  const containerRef = useRef<HTMLParagraphElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    let animationFrame = 0;
    let cancelled = false;

    const fit = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        // Clear the previous fitted size so the responsive Tailwind size is the
        // upper bound whenever the column or viewport grows again.
        text.style.fontSize = "";

        const availableWidth = container.clientWidth;
        const naturalWidth = text.scrollWidth;
        const responsiveSize = Number.parseFloat(window.getComputedStyle(text).fontSize);

        if (!availableWidth || !naturalWidth || !responsiveSize) return;

        // Leave a fraction of a percent for subpixel rounding and glyph overhangs.
        const fittedSize = Math.min(responsiveSize, responsiveSize * (availableWidth / naturalWidth) * 0.995);
        text.style.fontSize = `${Math.max(1, Math.floor(fittedSize * 10) / 10)}px`;
      });
    };

    const resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(container);
    fit();

    void document.fonts.ready.then(() => {
      if (!cancelled) fit();
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, [value]);

  return (
    <p ref={containerRef} className={`min-w-0 overflow-hidden ${containerClassName}`} title={value}>
      <span ref={textRef} className={`inline-block max-w-none whitespace-nowrap ${className}`}>
        {value}
      </span>
    </p>
  );
}
