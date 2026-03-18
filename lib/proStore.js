import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function markProUser(userId) {
  if (!userId) return;
  await redis.set(`pro:${userId}`, true);
}

export async function isProUser(userId) {
  if (!userId) return false;
  const value = await redis.get(`pro:${userId}`);
  return Boolean(value);
}
