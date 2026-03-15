import bcrypt from "bcryptjs";
import crypto from "crypto";
import db from "./db.js";

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");

  db.prepare(`
    INSERT INTO sessions (user_id, token)
    VALUES (?, ?)
  `).run(userId, token);

  return token;
}

export function getSessionUser(req) {
  const cookie = req.headers.cookie || "";
  const tokenMatch = cookie.match(/session_token=([^;]+)/);
  if (!tokenMatch) return null;

  const token = tokenMatch[1];

  const row = db.prepare(`
    SELECT users.*
    FROM sessions
    JOIN users ON sessions.user_id = users.id
    WHERE sessions.token = ?
  `).get(token);

  return row || null;
}

export function clearSession(req) {
  const cookie = req.headers.cookie || "";
  const tokenMatch = cookie.match(/session_token=([^;]+)/);
  if (!tokenMatch) return;

  db.prepare(`DELETE FROM sessions WHERE token = ?`).run(tokenMatch[1]);
}
