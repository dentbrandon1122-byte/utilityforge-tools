import crypto from "crypto";

const COOKIE_NAME = "uf_uid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const idx = part.indexOf("=");
        if (idx === -1) return [part, ""];
        return [
          decodeURIComponent(part.slice(0, idx)),
          decodeURIComponent(part.slice(idx + 1))
        ];
      })
  );
}

function appendSetCookie(res, cookieValue) {
  const existing = res.getHeader("Set-Cookie");

  if (!existing) {
    res.setHeader("Set-Cookie", [cookieValue]);
    return;
  }

  const next = Array.isArray(existing) ? existing : [existing];
  res.setHeader("Set-Cookie", [...next, cookieValue]);
}

function buildCookie(uid) {
  return [
    `${COOKIE_NAME}=${encodeURIComponent(uid)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    process.env.NODE_ENV === "production" ? "Secure" : "",
    `Max-Age=${COOKIE_MAX_AGE}`
  ]
    .filter(Boolean)
    .join("; ");
}

export function getUidFromRequest(req) {
  const cookies = parseCookies(req);
  return cookies[COOKIE_NAME] || null;
}

export function getOrCreateUid(req, res) {
  const existing = getUidFromRequest(req);
  if (existing) return existing;

  const uid = crypto.randomUUID();
  appendSetCookie(res, buildCookie(uid));
  return uid;
}
