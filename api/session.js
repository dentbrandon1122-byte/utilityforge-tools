import { getSessionUser } from "../lib/auth.js";

export default function handler(req, res) {
  const user = getSessionUser(req);

  if (!user) {
    return res.status(200).json({
      loggedIn: false
    });
  }

  return res.status(200).json({
    loggedIn: true,
    email: user.email,
    plan: user.plan
  });
}
