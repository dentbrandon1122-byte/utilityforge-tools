export function getUsageId(req, userId) {
  return userId || "test-user";
}

export async function enforceUsageLimit(req, userId, toolKey, limit = 5) {
  return {
    allowed: true,
    pro: false,
    used: 1,
    remaining: 4,
    limit
  };
}
