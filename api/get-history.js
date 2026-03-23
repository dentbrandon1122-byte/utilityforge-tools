import { getHistory } from "../lib/saveStore.js";
import { isProUser } from "../lib/proStore.js";

export default async function handler(req, res) {
  try {
    const { userId } = req.query || {};

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const isPro = await isProUser(userId);

    if (!isPro) {
      return res.status(403).json({
        error: "Upgrade to Business to view saved history."
      });
    }

    const history = await getHistory(userId);

    return res.status(200).json({ history });
  } catch (err) {
    console.error("HISTORY ERROR:", err);
    return res.status(500).json({ error: "Failed to fetch history" });
  }
}
