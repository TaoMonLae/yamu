"use client";

import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { useRef } from "react";

type DepthCardProps = {
  children: ReactNode;
  className?: string;
  maxRotation?: number;
  maxTranslation?: number;
  spotlight?: boolean;
  spotlightColor?: string;
  disableOnMobile?: boolean;
  respectReducedMotion?: boolean;
};

type DepthCardStyle = CSSProperties & {
  "--depth-rx": string;
  "--depth-ry": string;
  "--depth-tx": string;
  "--depth-ty": string;
  "--depth-x": string;
  "--depth-y": string;
  "--depth-spotlight": string;
};

export function DepthCard({
  children,
  className = "",
  maxRotation = 2.5,
  maxTranslation = 3,
  spotlight = true,
  spotlightColor = "rgba(255, 255, 255, 0.24)",
  disableOnMobile = true,
  respectReducedMotion = true,
}: DepthCardProps) {
  const planeRef = useRef<HTMLDivElement>(null);

  function interactionDisabled(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return true;
    if (disableOnMobile && window.matchMedia("(max-width: 767px)").matches) return true;
    return respectReducedMotion && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (interactionDisabled(event) || !planeRef.current) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    const plane = planeRef.current;

    plane.style.setProperty("--depth-rx", `${(0.5 - y) * maxRotation * 2}deg`);
    plane.style.setProperty("--depth-ry", `${(x - 0.5) * maxRotation * 2}deg`);
    plane.style.setProperty("--depth-tx", `${(x - 0.5) * maxTranslation * 2}px`);
    plane.style.setProperty("--depth-ty", `${(y - 0.5) * maxTranslation * 2}px`);
    plane.style.setProperty("--depth-x", `${x * 100}%`);
    plane.style.setProperty("--depth-y", `${y * 100}%`);
  }

  function resetPlane() {
    const plane = planeRef.current;
    if (!plane) return;
    plane.style.setProperty("--depth-rx", "0deg");
    plane.style.setProperty("--depth-ry", "0deg");
    plane.style.setProperty("--depth-tx", "0px");
    plane.style.setProperty("--depth-ty", "0px");
    plane.style.setProperty("--depth-x", "50%");
    plane.style.setProperty("--depth-y", "50%");
  }

  const style: DepthCardStyle = {
    "--depth-rx": "0deg",
    "--depth-ry": "0deg",
    "--depth-tx": "0px",
    "--depth-ty": "0px",
    "--depth-x": "50%",
    "--depth-y": "50%",
    "--depth-spotlight": spotlightColor,
  };

  return (
    <div
      className={`depth-card ${spotlight ? "depth-card--spotlight" : ""} ${className}`}
      onPointerMove={onPointerMove}
      onPointerLeave={resetPlane}
    >
      <div ref={planeRef} className="depth-card__plane" style={style}>
        {children}
      </div>
    </div>
  );
}
