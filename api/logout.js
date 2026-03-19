import { clearSessionCookie, destroySession } from "../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await destroySession(req);
    clearSessionCookie(res);

    return res.status(200).json({
      ok: true
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Logout failed."
    });
  }
}
