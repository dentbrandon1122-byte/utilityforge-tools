import { getUsageId, getUsageStatus } from "./_lib/usage.js";

export default async function handler(req, res) {
  try {
    const userId = req.query?.userId;
    const tool = req.query?.tool;

    if (!tool) {
      return res.status(400).json({ error: "Missing tool key." });
    }

    const usageId = getUsageId(req, userId);
    const status = getUsageStatus(usageId, tool, 5);

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
