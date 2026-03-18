import { getPlanAwareUsageStatus } from "../lib/usage.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const userId = req.query?.userId || "";
    const tool = req.query?.tool;

    if (!tool) {
      return res.status(400).json({ error: "Missing tool key." });
    }

    const status = await getPlanAwareUsageStatus(req, userId, tool, 5);
    return res.status(200).json(status);
  } catch (error) {
    console.error("USAGE STATUS ERROR:", error);
    return res.status(500).json({
      error: error.message || "Unable to load usage."
    });
  }
}
