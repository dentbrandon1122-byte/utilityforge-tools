import { getRemaining } from "./_lib/usage.js";

export default function handler(req, res) {

  const { userId, tool } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const remaining = getRemaining(userId, tool);

  res.json({
    remaining,
    pro:false
  });
}
