export async function runOpenAI({
  system,
  user,
  temperature = 0.7,
  maxTokens = 900
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error?.message ||
      "OpenAI request failed.";
    throw new Error(message);
  }

  const text = data?.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error("No content returned from OpenAI.");
  }

  return text;
}
