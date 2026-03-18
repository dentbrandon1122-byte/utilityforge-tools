import { handleToolRequest } from "../../lib/tool-runner";

export default async function handler(req, res) {
  return handleToolRequest(req, res, {
    system: `
You generate useful, creative ideas based on the user's prompt.
Make the ideas distinct, practical, and easy to scan.
Return only the ideas.
    `.trim(),
    temperature: 0.9,
    maxTokens: 1000,
    validate(body) {
      if (!body.input || !String(body.input).trim()) {
        return "Missing idea prompt.";
      }
      return null;
    },
    buildPrompt(body) {
      return `
Idea type: ${body.ideaType || "general"}
How many ideas: ${body.ideaCount || "5"}

Prompt:
${String(body.input || "").trim()}

Generate the requested ideas.
Return only the final idea list.
      `.trim();
    }
  });
}
