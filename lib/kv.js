const KV_URL =
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL;

const KV_TOKEN =
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN;

function ensureKvConfigured() {
  if (!KV_URL || !KV_TOKEN) {
    throw new Error("Missing KV_REST_API_URL / KV_REST_API_TOKEN.");
  }
}

async function kvCommand(command) {
  ensureKvConfigured();

  const response = await fetch(`${KV_URL}/${command.join("/")}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "KV command failed.");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data?.result;
}

export async function kvGet(key) {
  return kvCommand(["get", encodeURIComponent(key)]);
}

export async function kvSet(key, value) {
  return kvCommand([
    "set",
    encodeURIComponent(key),
    encodeURIComponent(value)
  ]);
}

export async function kvSetEx(key, seconds, value) {
  return kvCommand([
    "set",
    encodeURIComponent(key),
    encodeURIComponent(value),
    "EX",
    String(seconds)
  ]);
}

export async function kvDel(key) {
  return kvCommand(["del", encodeURIComponent(key)]);
}

export async function kvIncr(key) {
  return kvCommand(["incr", encodeURIComponent(key)]);
}

export async function kvExpire(key, seconds) {
  return kvCommand([
    "expire",
    encodeURIComponent(key),
    String(seconds)
  ]);
}
