import { handleToolRequest } from "../../lib/tool-runner";

export default async function handler(req, res) {
  return handleToolRequest(req, res, {
    system: `
You write strong first-draft cover letters.
Make the letter tailored, professional, and clear.
Use only the information provided.
Do not invent job history, certifications, or metrics.
Return only the cover letter.
    `.trim(),
    temperature: 0.7,
    maxTokens: 1200,
    validate(body) {
      const hasInput =
        String(body.jobTitle || "").trim() ||
        String(body.companyName || "").trim() ||
        String(body.background || "").trim() ||
        String(body.jobDescription || "").trim();

      if (!hasInput) {
        return "Missing cover letter input.";
      }
      return null;
    },
    buildPrompt(body) {
      return `
Job title: ${body.jobTitle || ""}
Company: ${body.companyName || ""}
Tone: ${body.tone || "professional"}
Length: ${body.length || "standard"}

Background / experience:
${body.background || ""}

Job description / requirements:
${body.jobDescription || ""}

What to emphasize:
${body.focus || ""}

Write a tailored cover letter draft.
Return only the final letter.
      `.trim();
    }
  });
}
