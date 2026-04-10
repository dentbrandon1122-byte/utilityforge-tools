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

async function kvFetchJson(url, options = {}) {
  ensureKvEnv();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || "KV request failed");
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("KV request timed out.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function kvGet(key) {
  const data = await kvFetchJson(
    `${KV_URL}/get/${encodeURIComponent(key)}`,
    {
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`
      }
    }
  );

  return data?.result;
}

async function kvSet(key, value) {
  const data = await kvFetchJson(
    `${KV_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(String(value))}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`
      }
    }
  );

  return data?.result;
}

async function kvDel(key) {
  const data = await kvFetchJson(
    `${KV_URL}/del/${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`
      }
    }
  );

  return data?.result;
}

export async function markProUser(userId) {
  if (!userId || !String(userId).trim()) {
    return false;
  }

  await kvSet(getProKey(userId), "true");
  return true;
}

export async function removeProUser(userId) {
  if (!userId || !String(userId).trim()) {
    return false;
  }

  await kvDel(getProKey(userId));
  return true;
}

export async function isProUser(userId) {
  if (!userId || !String(userId).trim()) {
    return false;
  }

  const value = await kvGet(getProKey(userId));

  return value === true || value === "true" || value === 1 || value === "1";
}
