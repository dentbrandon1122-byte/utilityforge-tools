import { kvGet, kvSet, kvDel } from "./kv";

function planKey(uid) {
  return `uf:plan:${uid}`;
}

export async function getPlanRecord(uid) {
  if (!uid) return null;

  const raw = await kvGet(planKey(uid));
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setPlanRecord(uid, record) {
  if (!uid) {
    throw new Error("Missing uid.");
  }

  await kvSet(planKey(uid), JSON.stringify(record));
}

export async function clearPlanRecord(uid) {
  if (!uid) return;
  await kvDel(planKey(uid));
}

export function isProPlan(record) {
  if (!record) return false;

  const plan = String(record.plan || "").toLowerCase();
  const status = String(record.status || "").toLowerCase();

  return (
    plan === "pro" &&
    (status === "active" || status === "trialing")
  );
}
