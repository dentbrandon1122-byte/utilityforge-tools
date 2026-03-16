export async function generateText({
  system,
  user,
  temperature = 0.7,
  model = "gpt-4o-mini"
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });

  const raw = await response.text();

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(raw || "OpenAI returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || "OpenAI request failed.");
  }

  const text = data?.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error("Model returned no text.");
  }

  return text;
}
