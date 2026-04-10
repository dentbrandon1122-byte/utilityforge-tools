import { authenticateUser, createSessionForUser, setSessionCookie } from "../lib/auth.js";
import { isProUser, markProUser, removeProUser } from "../lib/proStore.js";
import { kvGet, kvIncr, kvExpire } from "../lib/kv.js";

const MAX_ATTEMPTS = 10;
const WINDOW_SECONDS = 15 * 60; // 15-minute lockout window

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Brute force protection — check attempt count before doing anything
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  const bruteKey = `brute:${ip}`;

  try {
    const attempts = await kvGet(bruteKey);
    if (attempts && Number(attempts) >= MAX_ATTEMPTS) {
      return res
        .status(429)
        .json({ error: "Too many failed login attempts. Please try again later." });
    }
  } catch (_) {
    // KV unavailable — proceed rather than block the user
  }

  try {
    const { email, password, guestId } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await authenticateUser(email, password);

    if (!user) {
      // Increment failed-attempt counter, set expiry on first failure
      try {
        const count = await kvIncr(bruteKey);
        if (count === 1) {
          await kvExpire(bruteKey, WINDOW_SECONDS);
        }
      } catch (_) {}

      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Transfer Pro status from guest account to authenticated user if applicable
    if (guestId) {
      try {
        const guestIsPro = await isProUser(guestId);
        if (guestIsPro) {
          await markProUser(user.id);
          await removeProUser(guestId);
        }
      } catch (_) {}
    }

    const sessionId = await createSessionForUser(user.id);
    setSessionCookie(res, sessionId);

    return res.status(200).json({
      ok: true,
      user
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Login failed."
    });
  }
}
