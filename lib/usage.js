import { isProUser } from "./proStore.js";

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const DEFAULT_FREE_LIMIT = 5;

function ensureKvEnv() {
  if (!KV_URL || !KV_TOKEN) {
    throw new Error("Missing KV_REST_API_URL or KV_REST_API_TOKEN");
  }
}

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

async function kvFetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || "KV request failed");
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("KV request timed out.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function kvGet(key) {
  ensureKvEnv();

  const data = await kvFetchJson(
    `${KV_URL}/get/${encodeURIComponent(key)}`,
    {
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`
      }
    }
  );

  return Number(data?.result || 0);
}

async function kvIncr(key) {
  ensureKvEnv();

  const data = await kvFetchJson(
    `${KV_URL}/incr/${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`
      }
    }
  );

  return Number(data?.result || 0);
}

export async function getUsageCount(usageId, toolKey) {
  return kvGet(getUsageKey(usageId, toolKey));
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

  const nextUsed = await kvIncr(getUsageKey(usageId, toolKey));

  return {
    allowed: true,
    pro: false,
    usageId,
    used: nextUsed,
    remaining: Math.max(limit - nextUsed, 0),
    limit
  };
}
