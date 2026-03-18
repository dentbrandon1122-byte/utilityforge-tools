function getTextFromResponsesApi(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (Array.isArray(data?.output)) {
    const parts = [];

    for (const item of data.output) {
      if (!Array.isArray(item?.content)) continue;

      for (const content of item.content) {
        if (typeof content?.text === "string") {
          parts.push(content.text);
        }
      }
    }

    const joined = parts.join("\n").trim();
    if (joined) return joined;
  }

  return "";
}

export async function runOpenAIText({ systemPrompt, userText, model = "gpt-4.1-mini" }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }]
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userText }]
        }
      ]
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "OpenAI request failed");
  }

  const result = getTextFromResponsesApi(data);

  if (!result) {
    throw new Error("No text returned from OpenAI");
  }

  return result;
}
