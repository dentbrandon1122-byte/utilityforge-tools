import { isProUser } from "./proStore.js";

const dailyUsage = globalThis.__ufResumeUsage || (globalThis.__ufResumeUsage = {});

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function checkLimit(ip, limit = 5) {
  const today = new Date().toDateString();

  if (!dailyUsage[ip]) {
    dailyUsage[ip] = { date: today, count: 0 };
  }

  if (dailyUsage[ip].date !== today) {
    dailyUsage[ip] = { date: today, count: 0 };
  }

  if (dailyUsage[ip].count >= limit) {
    return false;
  }

  dailyUsage[ip].count += 1;
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
      const ip = getClientIp(req);
      if (!checkLimit(ip, 5)) {
        return res.status(429).json({
          error: "Daily free limit reached. Upgrade to Pro."
        });
      }
    }

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Text is required." });
    }

    if (text.trim().length > 1800) {
      return res.status(400).json({ error: "Text must be 1800 characters or fewer." });
    }

    if (!process.env.OPENAI_KEY) {
      return res.status(500).json({ error: "OPENAI_KEY is missing in environment variables." });
    }

    const allowedStyles = ["professional", "ats", "strong", "concise"];
    const selectedStyle = allowedStyles.includes(style) ? style : "professional";

    const styleInstructions = {
      professional: "Write polished, professional resume bullets with clear wording and strong readability.",
      ats: "Write ATS-friendly resume bullets using clear action verbs and searchable professional language.",
      strong: "Write strong resume bullets with impactful action verbs and confident phrasing.",
      concise: "Write concise resume bullets that stay short, clear, and professional."
    };

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
              "You turn rough job duties into strong resume bullet points. " +
              "Return 3 to 5 resume bullets. " +
              "Each bullet should start with a bullet symbol. " +
              "Do not include extra commentary or headings. " +
              styleInstructions[selectedStyle]
          },
          {
            role: "user",
            content: text.trim()
          }
        ],
        temperature: 0.5
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "OpenAI request failed."
      });
    }

    const result = data?.choices?.[0]?.message?.content?.trim();

    if (!result) {
      return res.status(500).json({ error: "No result returned from OpenAI." });
    }

    return res.status(200).json({ result });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Server error."
    });
  }
}
