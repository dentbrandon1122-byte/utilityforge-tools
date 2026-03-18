import { handleToolRequest } from "../../lib/tool-runner";

export default async function handler(req, res) {
  return handleToolRequest(req, res, {
    system: `
You write cold outreach emails.
Make them clear, respectful, and concise.
Do not sound spammy.
Use only the information provided.
Return only the email body.
    `.trim(),
    temperature: 0.7,
    maxTokens: 900,
    validate(body) {
      const hasInput =
        String(body.recipientType || "").trim() ||
        String(body.purpose || "").trim() ||
        String(body.context || "").trim();

      if (!hasInput) {
        return "Missing cold email input.";
      }
      return null;
    },
    buildPrompt(body) {
      return `
Recipient type: ${body.recipientType || ""}
Purpose: ${body.purpose || ""}
Tone: ${body.tone || "professional"}
Length: ${body.length || "standard"}

Context:
${body.context || ""}

Write a cold outreach email.
Return only the final email.
      `.trim();
    }
  });
}
