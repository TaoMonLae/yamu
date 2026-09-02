"use client";

import { useRef, type CSSProperties, type MouseEventHandler, type PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  className?: string;
  spotlightColor?: string;
}>;

type SpotlightStyle = CSSProperties & {
  "--mouse-x"?: string;
  "--mouse-y"?: string;
  "--spotlight-color"?: string;
};

// Adapted from React Bits SpotlightCard for the Yamu proof-sheet surface.
export function SpotlightCard({
  children,
  className = "",
  spotlightColor = "color-mix(in srgb, var(--index-accent) 9%, transparent)",
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePointerMove: MouseEventHandler<HTMLDivElement> = (event) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
    card.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
    card.style.setProperty("--spotlight-color", spotlightColor);
  };

  const style: SpotlightStyle = {
    "--mouse-x": "50%",
    "--mouse-y": "50%",
    "--spotlight-color": spotlightColor,
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handlePointerMove}
      className={`spotlight-card ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
