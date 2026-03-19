import { getUserFromSession } from "../lib/auth.js";
import { isProUser } from "../lib/proStore.js";

export default async function handler(req, res) {
  try {
    const user = await getUserFromSession(req);

    if (!user) {
      return res.status(200).json({
        loggedIn: false,
        user: null,
        pro: false
      });
    }

    const pro = await isProUser(user.id);

    return res.status(200).json({
      loggedIn: true,
      user,
      pro
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Unable to load session."
    });
  }
}
