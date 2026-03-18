import { handleToolRequest } from "../../lib/tool-runner";

export default async function handler(req, res) {
  return handleToolRequest(req, res, {
    system: `
You write strong LinkedIn summary drafts.
Make them clear, professional, and readable.
Use only the information provided.
Do not invent background details.
Return only the final summary.
    `.trim(),
    temperature: 0.7,
    maxTokens: 900,
    validate(body) {
      const hasInput =
        String(body.background || "").trim() ||
        String(body.goals || "").trim();

      if (!hasInput) {
        return "Missing LinkedIn summary input.";
      }
      return null;
    },
    buildPrompt(body) {
      return `
Tone: ${body.tone || "professional"}
Length: ${body.length || "standard"}

Background / experience:
${body.background || ""}

Career goals / focus:
${body.goals || ""}

Write a LinkedIn summary.
Return only the final summary.
      `.trim();
    }
  });
}
