const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

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

function getKey(usageId, toolKey) {
  return `usage:${getTodayKey()}:${usageId}:${toolKey}`;
}

async function kvGet(key) {
  const res = await fetch(`${KV_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  });
  const data = await res.json();
  return Number(data?.result || 0);
}

async function kvIncr(key) {
  const res = await fetch(`${KV_URL}/incr/${key}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  });
  const data = await res.json();
  return Number(data?.result || 0);
}

export async function enforceUsageLimit(req, userId, toolKey, limit = 5) {
  const usageId = getUsageId(req, userId);
  const key = getKey(usageId, toolKey);

  const used = await kvGet(key);

  if (used >= limit) {
    return {
      allowed: false,
      pro: false,
      usageId,
      used,
      remaining: 0,
      limit
    };
  }

  const next = await kvIncr(key);

  return {
    allowed: true,
    pro: false,
    usageId,
    used: next,
    remaining: Math.max(limit - next, 0),
    limit
  };
}
