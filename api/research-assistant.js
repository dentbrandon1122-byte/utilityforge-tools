import { enforceUsageLimit } from "../lib/usage.js";
import { runOpenAIText } from "../lib/toolRunner.js";

export const config = {
  maxDuration: 30
};

export default async function handler(req, res) {
  const startedAt = Date.now();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("RESEARCH_ASSISTANT start");

    const { text, mode = "general", userId } = req.body || {};
    const input = typeof text === "string" ? text.trim() : "";

    if (!input) {
      console.log("RESEARCH_ASSISTANT missing input", Date.now() - startedAt);
      return res.status(400).json({ error: "Missing research topic." });
    }

    console.log("RESEARCH_ASSISTANT before usage", Date.now() - startedAt);

    const usage = await enforceUsageLimit(req, userId, "research", 5);

    console.log("RESEARCH_ASSISTANT after usage", Date.now() - startedAt);

    if (!usage.allowed) {
      console.log("RESEARCH_ASSISTANT blocked by usage", Date.now() - startedAt);
      return res.status(429).json({
        error: "Daily free limit reached. Upgrade to Pro for unlimited usage.",
        pro: false,
        used: usage.used,
        remaining: usage.remaining,
        limit: usage.limit
      });
    }

    const promptMap = {
      general: `Give a structured research breakdown for this topic.

Topic:
${input}

Format the response with these exact sections:
1. Quick overview
2. Key ideas or facts
3. Important angles to understand
4. Open questions or gaps
5. Suggested next research steps

Formatting rules:
- Use short bullet points where helpful
- Keep the answer practical, clear, and easy to scan
- Avoid long paragraphs`,

      study: `Help with this topic as study support.

Topic:
${input}

Format the response with these exact sections:
1. Quick explanation
2. Main concepts to know
3. Easy study notes
4. What is most important to remember
5. Suggested review questions

Formatting rules:
- Use short bullet points
- Keep the wording clear and easy to understand
- Focus on helping someone learn the topic faster`,

      "issue-spotting": `Identify the main issues, risks, open questions, and follow-up areas related to this topic.

Topic:
${input}

Format the response with these exact sections:
1. Quick overview
2. Main issues or risks
3. Important open questions
4. Areas that need more verification
5. Suggested follow-up steps

Formatting rules:
- Use short bullet points
- Keep the answer practical and easy to scan
- Focus on identifying what deserves more attention`,

      structured: `Turn this topic into a clean structured breakdown.

Topic:
${input}

Format the response with these exact sections:
1. Topic overview
2. Main section breakdown
3. Subpoints under each section
4. Helpful framing or organization notes
5. Suggested next steps

Formatting rules:
- Use short bullet points
- Organize clearly
- Make it useful for outlining notes, studying, or starting research`
    };

    console.log("RESEARCH_ASSISTANT before openai", Date.now() - startedAt);

    const result = await runOpenAIText({
      system:
        "You are a practical research assistant. Break down topics clearly, organize ideas well, and make responses easy to scan. Focus on useful structure, clarity, and next-step guidance. Return only the response.",
      userText: promptMap[mode] || promptMap.general,
      maxTokens: 600
    });

    console.log("RESEARCH_ASSISTANT after openai", Date.now() - startedAt);

    if (!result || typeof result !== "string" || !result.trim()) {
      throw new Error("Research assistant returned an empty result.");
    }

    console.log("RESEARCH_ASSISTANT success", Date.now() - startedAt);

    return res.status(200).json({
      result: result.trim(),
      pro: usage.pro,
      used: usage.used,
      remaining: usage.remaining,
      limit: usage.limit
    });
  } catch (error) {
    console.error("RESEARCH ASSISTANT ERROR:", error);
    console.log("RESEARCH_ASSISTANT failed after", Date.now() - startedAt);

    return res.status(500).json({
      error: "The forge went out. Relight in a moment."
    });
  }
}
