import { createSessionForUser, createUser, setSessionCookie } from "../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password, name } = req.body || {};

    const user = await createUser({ email, password, name });
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
