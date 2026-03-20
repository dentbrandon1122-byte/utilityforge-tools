export async function runOpenAIText({ system, userText }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000); // HARD STOP

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userText }
        ],
        max_tokens: 200, // 🔥 IMPORTANT (was too high before)
        temperature: 0.6
      }),
      signal: controller.signal
    });

    const data = await response.json();

    return data?.choices?.[0]?.message?.content || "No response.";

  } catch (err) {
    console.error("OPENAI TIMEOUT/ERROR:", err);
    return "Request timed out. Try again.";
  } finally {
    clearTimeout(timeout);
  }
}
