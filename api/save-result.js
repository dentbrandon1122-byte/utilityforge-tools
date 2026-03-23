import { saveResult } from "../lib/saveStore.js";
import { isProUser } from "../lib/proStore.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, tool, input, output } = req.body || {};

    if (!userId || !tool || !output) {
      return res.status(400).json({ error: "Missing required data." });
    }

    const isPro = await isProUser(userId);

    if (!isPro) {
      return res.status(403).json({
        error: "Upgrade to Business to save results."
      });
    }

    const saved = await saveResult(userId, {
      tool,
      input: input || "",
      output
    });

    return res.status(200).json({ saved });
  } catch (err) {
    console.error("SAVE ERROR:", err);
    return res.status(500).json({ error: "Failed to save result" });
  }
}
