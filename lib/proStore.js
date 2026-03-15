import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function markProUser(userId) {
  await redis.set(`pro:${userId}`, true);
}

export async function isProUser(userId) {
  const value = await redis.get(`pro:${userId}`);
  return Boolean(value);
}
