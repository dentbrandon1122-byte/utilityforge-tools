import { handleToolRequest } from "../../lib/tool-runner";

export default async function handler(req, res) {
  return handleToolRequest(req, res, {
    system: `
You analyze job descriptions clearly.
Pull out keywords, skills, likely expectations, and useful targeting points.
Keep the output organized and practical.
Do not invent details not present in the posting.
    `.trim(),
    temperature: 0.45,
    maxTokens: 1200,
    validate(body) {
      if (!body.input || !String(body.input).trim()) {
        return "Missing job description input.";
      }
      return null;
    },
    buildPrompt(body) {
      return `
Analysis type: ${body.analysisType || "full"}
Detail level: ${body.focusLevel || "standard"}

Job posting:
${String(body.input || "").trim()}

Analyze this posting and return only the final analysis.
      `.trim();
    }
  });
}
