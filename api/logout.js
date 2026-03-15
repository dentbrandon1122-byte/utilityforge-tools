import { clearSession } from "../lib/auth.js";

export default function handler(req, res) {
  clearSession(req);

  res.setHeader(
    "Set-Cookie",
    "session_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax"
  );

  return res.status(200).json({ ok: true });
}
