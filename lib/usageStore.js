const usage = new Map();

export function getUsageId(req, userId) {
  if (userId) return userId;

  const ip =
    req.headers["x-forwarded-for"] ||
    req.socket?.remoteAddress ||
    "anon";

  return ip;
}

export function getUsageStatus(id, tool, limit = 5) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${id}:${tool}:${today}`;

  const count = usage.get(key) || 0;

  return {
    used: count,
    remaining: Math.max(limit - count, 0),
    limit
  };
}

export function incrementUsage(id, tool) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${id}:${tool}:${today}`;

  const count = usage.get(key) || 0;
  usage.set(key, count + 1);
}
