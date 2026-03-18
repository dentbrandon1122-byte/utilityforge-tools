const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

function ensureKvEnv() {
  if (!KV_URL || !KV_TOKEN) {
    throw new Error("Missing KV_REST_API_URL or KV_REST_API_TOKEN");
  }
}

function getProKey(userId) {
  return `pro:${String(userId).trim()}`;
}

async function kvGet(key) {
  ensureKvEnv();

  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`
    }
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || "KV get failed");
  }

  return data?.result;
}

async function kvSet(key, value) {
  ensureKvEnv();

  const res = await fetch(`${KV_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(String(value))}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`
    }
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || "KV set failed");
  }

  return data?.result;
}

export async function markProUser(userId) {
  if (!userId) return false;
  await kvSet(getProKey(userId), "true");
  return true;
}

export async function isProUser(userId) {
  if (!userId) return false;

  const value = await kvGet(getProKey(userId));

  return value === true || value === "true" || value === 1 || value === "1";
}
