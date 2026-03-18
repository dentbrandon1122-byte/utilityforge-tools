import { handleToolRequest } from "../../lib/tool-runner";

export default async function handler(req, res) {
  return handleToolRequest(req, res, {
    system: `
You are a strong email editor.
Rewrite rough emails so they are clearer, cleaner, and better structured.
Keep the user's meaning intact.
Do not add fake details.
Return only the polished email body.
    `.trim(),
    temperature: 0.65,
    maxTokens: 900,
    validate(body) {
      if (!body.input || !String(body.input).trim()) {
        return "Missing email input.";
      }
      return null;
    },
    buildPrompt(body) {
      return `
Tone: ${body.tone || "professional"}
Goal: ${body.goal || "clarity"}

Rough email:
${String(body.input || "").trim()}

Rewrite the email with the requested tone and goal.
Return only the final polished email.
      `.trim();
    }
  });
}
