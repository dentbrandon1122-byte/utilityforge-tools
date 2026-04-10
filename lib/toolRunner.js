export async function runOpenAIText({
  system,
  userText,
  maxTokens = 500,
  temperature = 0.6
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const controller = new AbortController();
  const timeoutMs = 18000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

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
          {
            role: "system",
            content: system || "You are a helpful assistant."
          },
          {
            role: "user",
            content: userText || ""
          }
        ],
        max_tokens: maxTokens,
        temperature
      }),
      signal: controller.signal
    });

    const raw = await response.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      console.error("OPENAI RAW RESPONSE:", raw);
      throw new Error("Invalid response returned from OpenAI.");
    }

    if (!response.ok) {
      const apiMessage = data?.error?.message || "OpenAI request failed.";

      if (response.status === 400) {
        throw new Error(apiMessage || "OpenAI rejected the request.");
      }

      if (response.status === 401) {
        throw new Error("OpenAI authentication failed. Check OPENAI_API_KEY.");
      }

      if (response.status === 429) {
        throw new Error("OpenAI rate limit reached. Please try again.");
      }

      if (response.status >= 500) {
        throw new Error("OpenAI server error. Please try again.");
      }

      throw new Error(apiMessage);
    }

    const content = data?.choices?.[0]?.message?.content;

    if (typeof content === "string" && content.trim()) {
      return content.trim();
    }

    throw new Error("OpenAI returned an empty result.");
  } catch (error) {
    console.error("OPENAI TOOL RUNNER ERROR:", error);

    if (error.name === "AbortError") {
      throw new Error("The AI request took too long and timed out.");
    }

    throw new Error(error.message || "OpenAI request failed.");
  } finally {
    clearTimeout(timeout);
  }
}
