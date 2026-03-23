import crypto from "crypto";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// Save result
export async function saveResult(userId, item) {
  if (!userId) return null;

  const key = `history:${userId}`;
  const id = crypto.randomUUID();

  const entry = {
    id,
    ...item,
    createdAt: Date.now()
  };

  await redis.lpush(key, JSON.stringify(entry));
  return entry;
}

// Get history
export async function getHistory(userId) {
  if (!userId) return [];

  const key = `history:${userId}`;
  const items = await redis.lrange(key, 0, 49);

  return (items || []).map((item) => {
    try {
      return JSON.parse(item);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

// Delete item
export async function deleteItem(userId, id) {
  if (!userId || !id) return;

  const key = `history:${userId}`;
  const items = await redis.lrange(key, 0, -1);

  const updated = (items || []).filter((item) => {
    try {
      const parsed = JSON.parse(item);
      return parsed.id !== id;
    } catch {
      return false;
    }
  });

  await redis.del(key);

  if (updated.length > 0) {
    await redis.rpush(key, ...updated);
  }
}
