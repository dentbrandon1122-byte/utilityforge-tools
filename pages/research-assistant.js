import { handleToolRequest } from "../../lib/tool-runner";

export default async function handler(req, res) {
  return handleToolRequest(req, res, {
    system: `
You help organize research notes into cleaner output.
You can create summaries, outlines, key points, or draft paragraphs.
Do not invent citations or facts.
Use only the user's material.
    `.trim(),
    temperature: 0.55,
    maxTokens: 1200,
    validate(body) {
      const hasInput =
        String(body.topic || "").trim() ||
        String(body.notes || "").trim();

      if (!hasInput) {
        return "Missing research input.";
      }
      return null;
    },
    buildPrompt(body) {
      return `
Topic:
${body.topic || ""}

Notes / source material:
${body.notes || ""}

Output type: ${body.outputType || "summary"}
Detail level: ${body.detailLevel || "standard"}

Create the requested research output.
Return only the final output.
      `.trim();
    }
  });
}
