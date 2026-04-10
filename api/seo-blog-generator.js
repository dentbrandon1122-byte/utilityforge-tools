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
    console.log("SEO_BLOG_GENERATOR start");

    const { text, mode = "outline", userId } = req.body || {};
    const input = typeof text === "string" ? text.trim() : "";

    if (!input) {
      console.log("SEO_BLOG_GENERATOR missing input", Date.now() - startedAt);
      return res.status(400).json({ error: "Missing topic or content goal." });
    }

    console.log("SEO_BLOG_GENERATOR before usage", Date.now() - startedAt);

    const usage = await enforceUsageLimit(req, userId, "seo-blog-generator", 5);

    console.log("SEO_BLOG_GENERATOR after usage", Date.now() - startedAt);

    if (!usage.allowed) {
      console.log("SEO_BLOG_GENERATOR blocked by usage", Date.now() - startedAt);
      return res.status(429).json({
        error: "Daily free limit reached. Upgrade to Pro for unlimited usage.",
        pro: false,
        used: usage.used,
        remaining: usage.remaining,
        limit: usage.limit
      });
    }

    const promptMap = {
      outline: `Create an SEO-focused blog outline for this topic.

Topic or content goal:
${input}

Format the response with these exact sections:
1. Suggested title
2. Search intent
3. Introduction angle
4. Main sections
5. Subpoints under each section
6. Suggested call to action

Formatting rules:
- Use short bullet points
- Keep it practical and easy to scan
- Make the outline realistic for a useful blog post`,

      titles: `Generate strong SEO-focused blog title ideas for this topic.

Topic or content goal:
${input}

Format the response with these exact sections:
1. Top title ideas
2. Best angle to lead with
3. Suggested primary keyword focus

Formatting rules:
- Give 10 title ideas
- Keep titles clear, realistic, and useful
- Avoid clickbait
- Make them feel publishable`,

      draft: `Create a clear SEO-focused blog draft for this topic.

Topic or content goal:
${input}

Format the response with these exact sections:
1. Suggested title
2. Introduction
3. Main body
4. Conclusion
5. Suggested call to action

Formatting rules:
- Keep the draft practical and easy to build on
- Use short paragraphs
- Avoid fluff
- Do not make it excessively long
- Aim for a strong partial draft, not a giant article`,

      ideas: `Generate SEO-focused content ideas for this topic.

Topic or content goal:
${input}

Format the response with these exact sections:
1. Best content opportunities
2. Search angles to target
3. Suggested article ideas
4. Quick priority recommendation

Formatting rules:
- Give 8 content ideas
- Keep the ideas realistic for organic traffic
- Focus on usefulness, clarity, and audience relevance`
    };

    console.log("SEO_BLOG_GENERATOR before openai", Date.now() - startedAt);

    const result = await runOpenAIText({
      system:
        "You are a practical SEO content strategist and blog writer. Help users create useful, search-focused blog content including titles, outlines, article ideas, and drafts. Prioritize clarity, structure, usefulness, and realistic traffic intent. Return only the requested content.",
      userText: promptMap[mode] || promptMap.outline,
      maxTokens: 700
    });

    console.log("SEO_BLOG_GENERATOR after openai", Date.now() - startedAt);

    if (!result || typeof result !== "string" || !result.trim()) {
      throw new Error("SEO blog generator returned an empty result.");
    }

    console.log("SEO_BLOG_GENERATOR success", Date.now() - startedAt);

    return res.status(200).json({
      result: result.trim(),
      pro: usage.pro,
      used: usage.used,
      remaining: usage.remaining,
      limit: usage.limit
    });
  } catch (error) {
    console.error("SEO BLOG GENERATOR ERROR:", error);
    console.log("SEO_BLOG_GENERATOR failed after", Date.now() - startedAt);

    return res.status(500).json({
      error: "The forge went out. Relight in a moment."
    });
  }
}
