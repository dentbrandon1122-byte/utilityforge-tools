import { Redis } from "@upstash/redis";
import { isProUser } from "./proStore.js";

const redis = Redis.fromEnv();
const DEFAULT_FREE_LIMIT = 5;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function getUsageId(req, userId) {
  if (userId && typeof userId === "string" && userId.trim()) {
    return `user:${userId.trim()}`;
  }

  const forwarded = req?.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return `ip:${forwarded.split(",")[0].trim()}`;
  }

  return `ip:${req?.socket?.remoteAddress || "unknown"}`;
}

function getUsageKey(usageId, toolKey) {
  return `usage:${getTodayKey()}:${usageId}:${toolKey}`;
}

export async function getUsageCount(usageId, toolKey) {
  const value = await redis.get(getUsageKey(usageId, toolKey));
  return Number(value || 0);
}

export async function incrementUsage(usageId, toolKey) {
  const key = getUsageKey(usageId, toolKey);
  const next = await redis.incr(key);
  await redis.expire(key, 60 * 60 * 24 * 3);
  return Number(next || 0);
}

export async function getUsageStatus(usageId, toolKey, limit = DEFAULT_FREE_LIMIT) {
  const used = await getUsageCount(usageId, toolKey);
  return {
    used,
    remaining: Math.max(limit - used, 0),
    limit
  };
}

export async function getPlanAwareUsageStatus(req, userId, toolKey, limit = DEFAULT_FREE_LIMIT) {
  const usageId = getUsageId(req, userId);
  const pro = await isProUser(userId);

  if (pro) {
    return {
      usageId,
      pro: true,
      used: 0,
      remaining: "unlimited",
      limit: "unlimited"
    };
  }

  const status = await getUsageStatus(usageId, toolKey, limit);
  return {
    usageId,
    pro: false,
    ...status
  };
}

export async function enforceUsageLimit(req, userId, toolKey, limit = DEFAULT_FREE_LIMIT) {
  const usageId = getUsageId(req, userId);
  const pro = await isProUser(userId);

  if (pro) {
    return {
      allowed: true,
      pro: true,
      usageId,
      used: 0,
      remaining: "unlimited",
      limit: "unlimited"
    };
  }

  const current = await getUsageStatus(usageId, toolKey, limit);

  if (current.remaining <= 0) {
    return {
      allowed: false,
      pro: false,
      usageId,
      ...current
    };
  }

  const nextUsed = await incrementUsage(usageId, toolKey);

  return {
    allowed: true,
    pro: false,
    usageId,
    used: nextUsed,
    remaining: Math.max(limit - nextUsed, 0),
    limit
  };
}
