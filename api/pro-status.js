import { isProUser } from "./proStore.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId } = req.body || {};

    console.log("pro-status check for userId:", userId);

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const pro = await isProUser(userId);

    console.log("pro-status result:", pro);

    return res.status(200).json({ pro });
  } catch (error) {
    console.error("pro-status error:", error);
    return res.status(500).json({ error: error.message || "Server error." });
  }
}
