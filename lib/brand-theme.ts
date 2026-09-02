import type { CSSProperties } from "react";

type BrandThemeStyle = CSSProperties & {
  "--index-accent": string;
  "--index-accent-dark": string;
  "--index-on-accent": string;
  "--index-background-rgb": string;
};

export function isHexColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function colorChannels(hex: string) {
  const normalized = isHexColor(hex) ? hex.slice(1) : "ff4f1f";
  return [0, 2, 4].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16));
}

function toHex(channels: number[]) {
  return `#${channels.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

function mix(hex: string, target: number, amount: number) {
  return toHex(colorChannels(hex).map((channel) => channel + (target - channel) * amount));
}

function relativeLuminance(channels: number[]) {
  const linear = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function brandThemeStyle(accentColor: string): BrandThemeStyle {
  const accent = isHexColor(accentColor) ? accentColor.toLowerCase() : "#ff4f1f";
  const channels = colorChannels(accent);
  const luminance = relativeLuminance(channels);
  const blackContrast = (luminance + 0.05) / 0.055;
  const whiteContrast = 1.05 / (luminance + 0.05);

  return {
    "--index-accent": accent,
    "--index-accent-dark": mix(accent, luminance > 0.32 ? 0 : 255, 0.17),
    "--index-on-accent": blackContrast >= whiteContrast ? "#11100e" : "#ffffff",
    "--index-background-rgb": channels.join(", "),
  };
}
