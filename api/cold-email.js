import { isProUser } from "../lib/proStore.js";

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {

    const { text } = req.body || {};

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Email context required" });
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
              "Write a clear professional cold email for networking or opportunities."
          },

          {
            role: "user",
            content: text
          }

        ],

        temperature: 0.5

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
