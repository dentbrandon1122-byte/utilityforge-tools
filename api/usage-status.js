import { isProUser } from "../lib/proStore.js";
import { getUsageId, getUsageStatus } from "../lib/usage.js";

export default async function handler(req, res) {
  try {
    const userId = req.query?.userId;
    const tool = req.query?.tool;

    if (!tool) {
      return res.status(400).json({ error: "Missing tool key." });
    }

    const pro = userId ? await isProUser(userId) : false;

    if (pro) {
      return res.status(200).json({
        pro: true,
        used: 0,
        remaining: "Unlimited",
        limit: "Unlimited"
      });
    }

    const usageId = getUsageId(req, userId);
    const status = await getUsageStatus(usageId, tool, 5);

    return res.status(200).json({
      pro: false,
      ...status
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Unable to load usage."
    });
  }
}
