import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

/**
 * Mark user as Pro
 * Optionally supports expiration (for subscriptions later)
 */
export async function markProUser(userId, options = {}) {
  if (!userId) return;

  const key = `pro:${userId}`;

  // Default: permanent (lifetime)
  if (!options.expiresIn) {
    await redis.set(key, true);
    return;
  }

  // If expiration provided (seconds)
  await redis.set(key, true, {
    ex: options.expiresIn
  });
}

/**
 * Check if user is Pro
 */
export async function isProUser(userId) {
  if (!userId) return false;

  const value = await redis.get(`pro:${userId}`);
  return value === true || value === "true";
}

/**
 * (Optional) Remove Pro access
 */
export async function removeProUser(userId) {
  if (!userId) return;
  await redis.del(`pro:${userId}`);
}
