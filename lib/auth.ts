import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const MAX_AGE = 60 * 60 * 12;

function cookieName() {
  return process.env.NODE_ENV === "production"
    ? "__Host-yamu_admin_session"
    : "yamu_admin_session";
}

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET?.trim();
  if (process.env.NODE_ENV === "production") {
    if (
      !value
      || Buffer.byteLength(value) < 32
      || value === process.env.ADMIN_PASSWORD
      || value === "replace-with-a-long-random-string"
    ) {
      throw new Error("ADMIN_SESSION_SECRET must be unique and at least 32 bytes in production.");
    }
    return value;
  }
  return value || "dev-only-change-me";
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function adminPassword() {
  const value = process.env.ADMIN_PASSWORD ?? "";
  if (process.env.NODE_ENV === "production") {
    if (value.length < 12 || value === "change-me") {
      throw new Error("ADMIN_PASSWORD must be at least 12 characters in production.");
    }
    return value;
  }
  return value || "change-me";
}

export function passwordsMatch(input: string, expected: string) {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    const dummy = Buffer.alloc(b.length);
    timingSafeEqual(dummy, dummy);
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function createSession() {
  const exp = Date.now() + MAX_AGE * 1000;
  const nonce = randomBytes(16).toString("hex");
  const payload = `${exp}.${nonce}`;
  const token = `${payload}.${sign(payload)}`;
  const jar = await cookies();
  jar.set(cookieName(), token, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
    priority: "high",
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(cookieName());
}

export async function isAuthed() {
  const jar = await cookies();
  const token = jar.get(cookieName())?.value;
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [exp, nonce, mac] = parts;
  if (!/^\d{13}$/.test(exp) || !/^[a-f0-9]{32}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(mac)) {
    return false;
  }
  const payload = `${exp}.${nonce}`;
  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return false;
  }
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return Number(exp) > Date.now();
}
