import db from "../lib/db.js";
import { verifyPassword, createSession } from "../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password } = req.body;

    const user = db.prepare(`
      SELECT * FROM users WHERE email = ?
    `).get(email);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const sessionToken = createSession(user.id);

    res.setHeader(
      "Set-Cookie",
      `session_token=${sessionToken}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax`
    );

    return res.status(200).json({
      ok: true,
      plan: user.plan
    });
  } catch (error) {
    return res.status(500).json({ error: "Login failed." });
  }
}
