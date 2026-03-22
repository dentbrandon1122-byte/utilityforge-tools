import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// Save result
export async function saveResult(userId, item) {
  if (!userId) return;

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
  const items = await redis.lrange(key, 0, 49); // last 50

  return items.map((i) => JSON.parse(i));
}

// Delete item
export async function deleteItem(userId, id) {
  if (!userId || !id) return;

  const key = `history:${userId}`;
  const items = await redis.lrange(key, 0, -1);

  const updated = items.filter((i) => {
    const parsed = JSON.parse(i);
    return parsed.id !== id;
  });

  await redis.del(key);

  if (updated.length > 0) {
    await redis.rpush(key, ...updated);
  }
}
