import fs from "node:fs";
import path from "node:path";
import { dataDir } from "@/lib/paths";
import { isHexColor } from "@/lib/brand-theme";
import type { BrandSettings } from "@/lib/types";

type BrandAsset = "logo" | "favicon";

type StoredBrandSettings = {
  siteName: string;
  tagline: string;
  accentColor: string;
  logoFile: string | null;
  faviconFile: string | null;
  updatedAt: string;
};

type AssetUpload = {
  bytes: Buffer;
  extension: string;
};

function hasAssetSignature(asset: BrandAsset, extension: string, bytes: Buffer) {
  if (extension === ".png") {
    return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
  }
  if (extension === ".jpg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (extension === ".webp") {
    return bytes.length >= 12
      && bytes.subarray(0, 4).toString("ascii") === "RIFF"
      && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  }
  if (asset === "favicon" && extension === ".ico") {
    return bytes.length >= 4 && bytes.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0]));
  }
  return false;
}

const DEFAULT_ASSET = "__default__";

const DEFAULTS: StoredBrandSettings = {
  siteName: "YAMU",
  tagline: "",
  accentColor: "#ff4f1f",
  logoFile: DEFAULT_ASSET,
  faviconFile: DEFAULT_ASSET,
  updatedAt: "default",
};

const ASSET_RULES = {
  logo: {
    maxBytes: 2 * 1024 * 1024,
    types: new Map([
      ["image/png", ".png"],
      ["image/jpeg", ".jpg"],
      ["image/webp", ".webp"],
    ]),
  },
  favicon: {
    maxBytes: 512 * 1024,
    types: new Map([
      ["image/png", ".png"],
      ["image/x-icon", ".ico"],
      ["image/vnd.microsoft.icon", ".ico"],
    ]),
  },
} as const;

function settingsPath() {
  return path.join(dataDir(), "branding.json");
}

function assetsDir() {
  return path.join(dataDir(), "branding");
}

function readStoredSettings(): StoredBrandSettings {
  try {
    const parsed = JSON.parse(fs.readFileSync(settingsPath(), "utf8")) as Partial<StoredBrandSettings>;
    return {
      siteName: typeof parsed.siteName === "string" && parsed.siteName.trim() ? parsed.siteName.trim() : DEFAULTS.siteName,
      tagline: typeof parsed.tagline === "string" ? parsed.tagline.trim() : DEFAULTS.tagline,
      accentColor: typeof parsed.accentColor === "string" && isHexColor(parsed.accentColor) ? parsed.accentColor.toLowerCase() : DEFAULTS.accentColor,
      logoFile: typeof parsed.logoFile === "string" ? path.basename(parsed.logoFile) : null,
      faviconFile: typeof parsed.faviconFile === "string" ? path.basename(parsed.faviconFile) : null,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : DEFAULTS.updatedAt,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function assetUrl(asset: BrandAsset, filename: string | null, updatedAt: string) {
  if (filename === DEFAULT_ASSET) {
    return asset === "logo" ? "/yamu-logo.png" : "/favicon.png";
  }
  if (!filename || !fs.existsSync(path.join(assetsDir(), filename))) return null;
  return `/api/branding/${asset}?v=${encodeURIComponent(updatedAt)}`;
}

function toPublicSettings(stored: StoredBrandSettings): BrandSettings {
  return {
    siteName: stored.siteName,
    tagline: stored.tagline,
    accentColor: stored.accentColor,
    logoUrl: assetUrl("logo", stored.logoFile, stored.updatedAt),
    faviconUrl: assetUrl("favicon", stored.faviconFile, stored.updatedAt),
    updatedAt: stored.updatedAt,
  };
}

export function getBrandSettings() {
  return toPublicSettings(readStoredSettings());
}

async function prepareUpload(asset: BrandAsset, file: File | null): Promise<AssetUpload | null> {
  if (!file || file.size === 0) return null;
  const rules = ASSET_RULES[asset];
  const extension = rules.types.get(file.type as never);
  if (!extension) {
    throw new Error(asset === "logo" ? "Use a PNG, JPG, or WebP logo." : "Use a PNG or ICO favicon.");
  }
  if (file.size > rules.maxBytes) {
    throw new Error(asset === "logo" ? "Keep the logo under 2 MB." : "Keep the favicon under 512 KB.");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!hasAssetSignature(asset, extension, bytes)) {
    throw new Error(asset === "logo" ? "The logo file is not a valid image." : "The favicon file is not a valid PNG or ICO image.");
  }
  return { bytes, extension };
}

function removeStoredAsset(filename: string | null) {
  if (!filename || filename === DEFAULT_ASSET) return;
  const target = path.join(assetsDir(), path.basename(filename));
  if (fs.existsSync(target)) fs.unlinkSync(target);
}

export async function updateBrandSettings(input: {
  siteName: string;
  tagline: string;
  accentColor: string;
  logo: File | null;
  favicon: File | null;
  removeLogo: boolean;
  removeFavicon: boolean;
  reset: boolean;
}) {
  const current = readStoredSettings();
  const siteName = input.reset ? DEFAULTS.siteName : input.siteName.trim();
  const tagline = input.reset ? DEFAULTS.tagline : input.tagline.trim();
  const accentColor = input.reset ? DEFAULTS.accentColor : input.accentColor.trim().toLowerCase();

  if (!siteName || siteName.length > 40) throw new Error("Site name must contain 1 to 40 characters.");
  if (tagline.length > 100) throw new Error("Tagline must contain no more than 100 characters.");
  if (!isHexColor(accentColor)) throw new Error("Accent color must use a 6-digit hex value, such as #ff4f1f.");

  const [logoUpload, faviconUpload] = input.reset
    ? [null, null]
    : await Promise.all([
      prepareUpload("logo", input.logo),
      prepareUpload("favicon", input.favicon),
    ]);

  fs.mkdirSync(assetsDir(), { recursive: true });
  let logoFile = current.logoFile;
  let faviconFile = current.faviconFile;

  if (input.reset) {
    removeStoredAsset(current.logoFile);
    removeStoredAsset(current.faviconFile);
    logoFile = DEFAULT_ASSET;
    faviconFile = DEFAULT_ASSET;
  } else if (input.removeLogo || logoUpload) {
    removeStoredAsset(current.logoFile);
    logoFile = null;
  }
  if (!input.reset && (input.removeFavicon || faviconUpload)) {
    removeStoredAsset(current.faviconFile);
    faviconFile = null;
  }
  if (logoUpload) {
    logoFile = `logo${logoUpload.extension}`;
    fs.writeFileSync(path.join(assetsDir(), logoFile), logoUpload.bytes);
  }
  if (faviconUpload) {
    faviconFile = `favicon${faviconUpload.extension}`;
    fs.writeFileSync(path.join(assetsDir(), faviconFile), faviconUpload.bytes);
  }

  const next: StoredBrandSettings = {
    siteName,
    tagline,
    accentColor,
    logoFile,
    faviconFile,
    updatedAt: new Date().toISOString(),
  };
  fs.mkdirSync(dataDir(), { recursive: true });
  fs.writeFileSync(settingsPath(), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return toPublicSettings(next);
}

export function getBrandAsset(asset: BrandAsset) {
  const settings = readStoredSettings();
  const filename = asset === "logo" ? settings.logoFile : settings.faviconFile;
  if (!filename || filename === DEFAULT_ASSET) return null;
  const target = path.join(assetsDir(), path.basename(filename));
  if (!fs.existsSync(target)) return null;
  const extension = path.extname(filename).toLowerCase();
  const mime = extension === ".png"
    ? "image/png"
    : extension === ".jpg"
      ? "image/jpeg"
      : extension === ".webp"
        ? "image/webp"
        : "image/x-icon";
  return { bytes: fs.readFileSync(target), mime };
}
