import { handleToolRequest } from "../../lib/tool-runner";

export default async function handler(req, res) {
  return handleToolRequest(req, res, {
    system: `
You summarize text clearly and accurately.
Keep the important meaning.
Do not invent facts.
Match the requested format and length.
    `.trim(),
    temperature: 0.5,
    maxTokens: 900,
    validate(body) {
      if (!body.input || !String(body.input).trim()) {
        return "Missing text input.";
      }
      return null;
    },
    buildPrompt(body) {
      return `
Summary type: ${body.summaryType || "standard"}
Length: ${body.summaryLength || "medium"}

Text to summarize:
${String(body.input || "").trim()}

Return only the summary.
      `.trim();
    }
  });
}
