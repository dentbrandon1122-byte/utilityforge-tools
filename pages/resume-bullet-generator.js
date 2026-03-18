import { handleToolRequest } from "../../lib/tool-runner";

export default async function handler(req, res) {
  return handleToolRequest(req, res, {
    system: `
You turn rough work notes into strong resume bullets.
Use action verbs.
Keep claims realistic.
Do not invent numbers or achievements unless the user supplied them.
Return only the bullet list.
    `.trim(),
    temperature: 0.65,
    maxTokens: 900,
    validate(body) {
      if (!body.input || !String(body.input).trim()) {
        return "Missing resume bullet input.";
      }
      return null;
    },
    buildPrompt(body) {
      return `
Bullet style: ${body.style || "professional"}
Bullet count: ${body.count || "3"}

Raw notes:
${String(body.input || "").trim()}

Turn this into resume bullets.
Return only the bullet list.
      `.trim();
    }
  });
}
