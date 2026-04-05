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
    console.log("JOB_ANALYZER start");

    const { text, mode = "ats", userId } = req.body || {};
    const input = typeof text === "string" ? text.trim() : "";

    if (!input) {
      console.log("JOB_ANALYZER missing input", Date.now() - startedAt);
      return res.status(400).json({ error: "Missing job description." });
    }

    console.log("JOB_ANALYZER before usage", Date.now() - startedAt);

    const usage = await enforceUsageLimit(req, userId, "job", 5);

    console.log("JOB_ANALYZER after usage", Date.now() - startedAt);

    if (!usage.allowed) {
      console.log("JOB_ANALYZER blocked by usage", Date.now() - startedAt);
      return res.status(429).json({
        error: "Daily free limit reached. Upgrade to Pro for unlimited usage.",
        pro: false,
        used: usage.used,
        remaining: usage.remaining,
        limit: usage.limit
      });
    }

    const promptMap = {
      ats: `Analyze this job description for ATS alignment and hiring priorities.

Job description:
${input}

Format the response with these exact sections:
1. Quick diagnosis
2. Top skills to emphasize
3. Likely ATS keywords
4. Core responsibilities
5. What the employer seems to care about most
6. Resume targeting advice
7. Quick action steps

Formatting rules:
- Use short bullet points
- Keep it practical and easy to scan
- Focus on what helps the applicant tailor their resume better`,

      skills: `Break this job description into the main skills, responsibilities, and knowledge areas.

Job description:
${input}

Format the response with these exact sections:
1. Quick diagnosis
2. Core hard skills
3. Core soft skills
4. Main responsibilities
5. Knowledge areas
6. What should be highlighted on a resume
7. Quick action steps

Formatting rules:
- Use short bullet points
- Avoid long paragraphs
- Focus on practical resume and application relevance`,

      keywords: `Extract and analyze the most important keywords and phrases from this job description for resume targeting.

Job description:
${input}

Format the response with these exact sections:
1. Quick diagnosis
2. Top keyword phrases
3. Technical keywords
4. Role-specific language
5. Keywords to mirror naturally
6. Resume targeting advice
7. Quick action steps

Formatting rules:
- Use short bullet points
- Keep the wording practical and easy to apply
- Focus on keywords that are likely important for ATS and recruiters`,

      plain: `Summarize this job description in a clear, practical way and explain what the employer seems to care about most.

Job description:
${input}

Format the response with these exact sections:
1. Quick diagnosis
2. What this job is really asking for
3. Main responsibilities
4. Most important qualifications
5. What the employer seems to care about most
6. How an applicant should position themselves
7. Quick action steps

Formatting rules:
- Use short bullet points
- Keep it clear and easy to scan
- Focus on practical interpretation, not fluff`
    };

    console.log("JOB_ANALYZER before openai", Date.now() - startedAt);

    const result = await runOpenAIText({
      system:
        "You are a practical job description analyst and resume targeting strategist. Analyze job postings clearly and help applicants understand what to emphasize, which keywords matter, and how to position themselves better. Be specific, useful, and easy to scan. Return only the analysis.",
      userText: promptMap[mode] || promptMap.ats,
      maxTokens: 600
    });

    console.log("JOB_ANALYZER after openai", Date.now() - startedAt);

    if (!result || typeof result !== "string" || !result.trim()) {
      throw new Error("Job analyzer returned an empty result.");
    }

    console.log("JOB_ANALYZER success", Date.now() - startedAt);

    return res.status(200).json({
      result: result.trim(),
      pro: usage.pro,
      used: usage.used,
      remaining: usage.remaining,
      limit: usage.limit
    });
  } catch (error) {
    console.error("JOB ANALYZER ERROR:", error);
    console.log("JOB_ANALYZER failed after", Date.now() - startedAt);

    return res.status(500).json({
      error: "The forge went out. Relight in a moment."
    });
  }
}
