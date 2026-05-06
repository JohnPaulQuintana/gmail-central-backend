const fetch = require("node-fetch");

async function geminiExtract(text) {
  try {
    const prompt = `
You are a receipt parser.

Return ONLY valid JSON. No markdown. No text.

Schema:
{
  "amount": string|null,
  "merchant": string|null,
  "balance": string|null,
  "reference": string|null
}

Rules:
- Do NOT include explanations
- Do NOT wrap in code blocks
- If unknown, return null

TEXT:
${text}
`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await res.json();

    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    console.log("RAW GEMINI OUTPUT:", raw);

    if (!raw) return null;

    // CLEAN HARD (IMPORTANT)
    const cleaned = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(cleaned);

  } catch (err) {
    console.error("Gemini parse error:", err.message);
    return null;
  }
}

module.exports = { geminiExtract };