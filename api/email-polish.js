import { isProUser } from "./proStore.js";

const dailyUsage = globalThis.__ufEmailUsage || (globalThis.__ufEmailUsage = {});

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
    const { text, tone, userId } = req.body || {};
    const pro = userId ? await isProUser(userId) : false;
    const maxLength = pro ? 5000 : 1500;

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

    if (text.trim().length > maxLength) {
      return res.status(400).json({ error: `Text must be ${maxLength} characters or fewer.` });
    }

    if (!process.env.OPENAI_KEY) {
      return res.status(500).json({
        error: "OPENAI_KEY is missing in Vercel environment variables."
      });
    }

    const allowedTones = ["professional", "friendly", "confident", "concise"];
    const selectedTone = allowedTones.includes(tone) ? tone : "professional";

    const toneInstructions = {
      professional: "Make it polished, professional, respectful, and natural.",
      friendly: "Make it warm, approachable, friendly, and natural while still sounding polished.",
      confident: "Make it confident, clear, direct, and professional without sounding aggressive.",
      concise: "Make it concise, clear, and professional while keeping the message brief."
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
              "You rewrite rough emails. Keep the user's meaning the same. " +
              "Improve grammar, clarity, tone, and flow. " +
              "Do not add extra facts. Do not turn it into a long letter unless needed. " +
              "Return only the polished email text with no intro, no labels, and no quotation marks. " +
              toneInstructions[selectedTone]
          },
          {
            role: "user",
            content: text.trim()
          }
        ],
        temperature: 0.4
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
