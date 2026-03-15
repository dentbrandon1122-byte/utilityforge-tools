import { isProUser } from "../lib/proStore.js";

const usage = globalThis.__ufJobAnalyzer || (globalThis.__ufJobAnalyzer = {});

function getIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function checkLimit(ip, limit = 5) {
  const today = new Date().toDateString();

  if (!usage[ip]) usage[ip] = { date: today, count: 0 };

  if (usage[ip].date !== today) usage[ip] = { date: today, count: 0 };

  if (usage[ip].count >= limit) return false;

  usage[ip].count += 1;
  return true;
}

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {

    const { text, style, userId } = req.body || {};

    const pro = userId ? await isProUser(userId) : false;

    if (!pro) {
      const ip = getIp(req);
      if (!checkLimit(ip, 5)) {
        return res.status(429).json({
          error: "Daily free limit reached. Upgrade to Pro."
        });
      }
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Job description required" });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {

      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_KEY}`
      },

      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [

          {
            role: "system",
            content:
              "Analyze job descriptions. Return sections: Key Skills, ATS Keywords, Resume Focus."
          },

          {
            role: "user",
            content: text
          }

        ],
        temperature: 0.3
      })

    });

    const data = await response.json();

    const result = data?.choices?.[0]?.message?.content?.trim();

    return res.status(200).json({ result });

  } catch (error) {

    return res.status(500).json({
      error: error.message || "Server error"
    });

  }
}
