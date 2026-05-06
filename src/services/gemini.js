async function geminiExtract(text) {
  try {
    const prompt = `
You are a receipt parser.

Return ONLY JSON:

{
  "amount": string|null,
  "merchant": string|null,
  "date": string|null,
  "reference": string|null,
  "category": string,
  "subcategory": string
}

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
      },
    );

    const data = await res.json();

    const output = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!output) return null;

    return JSON.parse(output.replace("```json", "").replace("```", "").trim());
  } catch (err) {
    console.error("Gemini error:", err);
    return null;
  }
}

module.exports = { geminiExtract };
