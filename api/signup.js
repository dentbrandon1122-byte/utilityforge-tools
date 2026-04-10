import { createSessionForUser, createUser, setSessionCookie } from "../lib/auth.js";
import { isProUser, markProUser, removeProUser } from "../lib/proStore.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password, name, guestId } = req.body || {};

    // Input length validation
    if (email && email.length > 254) {
      return res.status(400).json({ error: "Email must be 254 characters or fewer." });
    }
    if (name && name.length > 100) {
      return res.status(400).json({ error: "Name must be 100 characters or fewer." });
    }
    if (password && password.length > 512) {
      return res.status(400).json({ error: "Password must be 512 characters or fewer." });
    }

    const user = await createUser({ email, password, name });

    // Transfer Pro status from guest account to new user if applicable
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
    return res.status(400).json({
      error: error.message || "Unable to create account."
    });
  }
}
