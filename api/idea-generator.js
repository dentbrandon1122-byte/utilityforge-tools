import { isProUser } from "../lib/proStore.js";

const dailyUsage = globalThis.__ufIdeaUsage || (globalThis.__ufIdeaUsage = {});

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
    const { prompt, userId } = req.body || {};
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

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    if (prompt.trim().length > maxLength) {
      return res.status(400).json({ error: `Prompt must be ${maxLength} characters or fewer.` });
    }

    if (!process.env.OPENAI_KEY) {
      return res.status(500).json({ error: "OPENAI_KEY is missing in environment variables." });
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
              "You generate creative but realistic ideas. Return a clear numbered list. " +
              "Keep the ideas useful, specific, and easy to understand. " +
              "Do not include extra commentary before or after the list."
          },
          {
            role: "user",
            content: prompt.trim()
          }
        ],
        temperature: 0.8
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
