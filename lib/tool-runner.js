import { runOpenAI } from "./openai";

function badMethod(res) {
  return res.status(405).json({ error: "Method not allowed." });
}

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

function serverError(res, error) {
  return res.status(500).json({
    error: error?.message || "Something went wrong."
  });
}

export async function handleToolRequest(req, res, config) {
  if (req.method !== "POST") {
    return badMethod(res);
  }

  try {
    const {
      buildPrompt,
      system,
      temperature = 0.7,
      maxTokens = 900,
      validate
    } = config;

    if (typeof validate === "function") {
      const validationMessage = validate(req.body || {});
      if (validationMessage) {
        return badRequest(res, validationMessage);
      }
    }

    const userPrompt = buildPrompt(req.body || {});
    const result = await runOpenAI({
      system,
      user: userPrompt,
      temperature,
      maxTokens
    });

    return res.status(200).json({ result });
  } catch (error) {
    return serverError(res, error);
  }
}
