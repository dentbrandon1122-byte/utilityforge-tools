import { isProUser } from "../lib/proStore.js";

export default async function handler(req, res) {

  try {

    const pro = false;

    res.status(200).json({
      pro,
      used: 0,
      remaining: pro ? "Unlimited" : 5
    });

  } catch (err) {

    res.status(500).json({
      error: "Usage check failed"
    });

  }

}
