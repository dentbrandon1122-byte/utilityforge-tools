import crypto from "crypto";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const SESSION_COOKIE = "uf_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function baseCookieParts() {
  const isProd = process.env.NODE_ENV === "production";
  return [
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    isProd ? "Secure" : ""
  ].filter(Boolean);
}

function serializeCookie(name, value, maxAgeSeconds) {
  const parts = [
    `${name}=${value}`,
    ...baseCookieParts(),
    typeof maxAgeSeconds === "number" ? `Max-Age=${maxAgeSeconds}` : ""
  ].filter(Boolean);

  return parts.join("; ");
}

function parseCookies(req) {
  const header = req.headers?.cookie || "";
  return header.split(";").reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join("=") || "");
    return acc;
  }, {});
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name || ""
  };
}

export function setSessionCookie(res, sessionId) {
  res.setHeader("Set-Cookie", serializeCookie(SESSION_COOKIE, encodeURIComponent(sessionId), SESSION_TTL_SECONDS));
}

export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", serializeCookie(SESSION_COOKIE, "", 0));
}

export function getSessionIdFromRequest(req) {
  const cookies = parseCookies(req);
  return cookies[SESSION_COOKIE] || null;
}

export async function hashPassword(password) {
  return await new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

export async function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, key] = storedHash.split(":");

  return await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(crypto.timingSafeEqual(Buffer.from(key, "hex"), derivedKey));
    });
  });
}

export async function findUserByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const userId = await redis.get(`user:email:${normalized}`);
  if (!userId) return null;

  const user = await redis.get(`user:${userId}`);
  return user || null;
}

export async function findUserById(userId) {
  if (!userId) return null;
  return (await redis.get(`user:${userId}`)) || null;
}

export async function createUser({ email, password, name }) {
  const normalizedEmail = normalizeEmail(email);
  const cleanName = String(name || "").trim();

  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw new Error("An account with that email already exists.");
  }

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  const user = {
    id,
    email: normalizedEmail,
    name: cleanName,
    passwordHash,
    createdAt: new Date().toISOString()
  };

  await redis.set(`user:${id}`, user);
  await redis.set(`user:email:${normalizedEmail}`, id);

  return sanitizeUser(user);
}

export async function createSessionForUser(userId) {
  const sessionId = crypto.randomUUID();
  const session = {
    id: sessionId,
    userId,
    createdAt: new Date().toISOString()
  };

  await redis.set(`session:${sessionId}`, session, { ex: SESSION_TTL_SECONDS });
  return sessionId;
}

export async function getUserFromSession(req) {
  const sessionId = getSessionIdFromRequest(req);
  if (!sessionId) return null;

  const session = await redis.get(`session:${sessionId}`);
  if (!session?.userId) return null;

  const user = await findUserById(session.userId);
  return sanitizeUser(user);
}

export async function destroySession(req) {
  const sessionId = getSessionIdFromRequest(req);
  if (!sessionId) return;
  await redis.del(`session:${sessionId}`);
}

export async function authenticateUser(email, password) {
  const user = await findUserByEmail(email);
  if (!user) return null;

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;

  return sanitizeUser(user);
}
