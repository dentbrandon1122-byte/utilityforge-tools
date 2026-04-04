import { enforceUsageLimit } from "../lib/usage.js";
import { runOpenAIText } from "../lib/toolRunner.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, mode = "outline", userId } = req.body || {};
    const input = typeof text === "string" ? text.trim() : "";

    if (!input) {
      return res.status(400).json({ error: "Missing topic or content goal." });
    }

    const usage = await enforceUsageLimit(req, userId, "seo-blog-generator", 5);

    if (!usage.allowed) {
      return res.status(429).json({
        error: "Daily free limit reached. Upgrade to Pro for unlimited usage.",
        pro: false,
        used: usage.used,
        remaining: usage.remaining,
        limit: usage.limit
      });
    }

    const modePromptMap = {
      outline:
        "Create an SEO-focused blog outline for this topic. Include a strong title, introduction angle, main sections, and useful subpoints.",
      titles:
        "Generate a list of strong SEO-focused blog title ideas for this topic. Make them useful, clear, and realistic for search traffic.",
      draft:
        "Create an SEO-focused blog draft for this topic. Make it clear, structured, useful, and easy to build on.",
      ideas:
        "Generate SEO-focused content ideas for this topic. Include article angles that could realistically support organic traffic and audience interest."
    };

    const prompt = `${modePromptMap[mode] || modePromptMap.outline}

Topic or content goal:
${input}

Keep the output clear, practical, and structured for search-focused content creation.`;

    const result = await runOpenAIText({
      system:
        "You are an SEO content strategist and blog writer. Help users create useful, search-focused blog content including titles, outlines, article ideas, and drafts. Prioritize clarity, structure, usefulness, and realistic traffic intent. Return only the requested content.",
      userText: prompt,
      maxTokens: 900
    });

    if (!result || typeof result !== "string" || !result.trim()) {
      throw new Error("SEO blog generator returned an empty result.");
    }

    return res.status(200).json({
      result: result.trim(),
      pro: usage.pro,
      used: usage.used,
      remaining: usage.remaining,
      limit: usage.limit
    });
  } catch (error) {
    console.error("SEO BLOG GENERATOR ERROR:", error);
    return res.status(500).json({
      error: error.message || "SEO blog generation failed."
    });
  }
}
