export async function runOpenAIText({ systemPrompt, userText }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000); // 12 sec hard limit

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `${systemPrompt}\n\n${userText}`
      })
    });

    clearTimeout(timeout);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || "OpenAI failed");
    }

    // FAST extraction (no loops)
    const text =
      data.output?.[0]?.content?.[0]?.text ||
      data.output_text ||
      "";

    if (!text) {
      throw new Error("Empty response from OpenAI");
    }

    return text.trim();

  } catch (err) {
    clearTimeout(timeout);

    if (err.name === "AbortError") {
      throw new Error("Request timed out (OpenAI took too long)");
    }

    throw err;
  }
}
