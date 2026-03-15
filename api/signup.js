import db from "../lib/db.js";
import { hashPassword, createSession } from "../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email);
    if (existing) {
      return res.status(409).json({ error: "Account already exists." });
    }

    const passwordHash = await hashPassword(password);

    const result = db.prepare(`
      INSERT INTO users (email, password_hash)
      VALUES (?, ?)
    `).run(email, passwordHash);

    const sessionToken = createSession(result.lastInsertRowid);

    res.setHeader(
      "Set-Cookie",
      `session_token=${sessionToken}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax`
    );

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Signup failed." });
  }
}
