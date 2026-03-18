const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

export async function markProUser(userId) {
  if (!userId) return;

  await fetch(`${KV_URL}/set/pro:${userId}/true`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  });
}

export async function isProUser(userId) {
  if (!userId) return false;

  const res = await fetch(`${KV_URL}/get/pro:${userId}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  });

  const data = await res.json();
  return Boolean(data?.result);
}
