export async function runOpenAIText({ system, userText }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userText }
        ],
        max_tokens: 400,
        temperature: 0.7
      }),
      signal: controller.signal
    });

    const raw = await response.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(raw || "Invalid OpenAI response.");
    }

    if (!response.ok) {
      throw new Error(data?.error?.message || "OpenAI request failed.");
    }

    const content = data?.choices?.[0]?.message?.content;

    if (typeof content === "string" && content.trim()) {
      return content.trim();
    }

    throw new Error("OpenAI returned an empty result.");
  } catch (error) {
    console.error("OPENAI TOOL RUNNER ERROR:", error);
    throw new Error(error.message || "OpenAI request failed.");
  } finally {
    clearTimeout(timeout);
  }
}
