async function geminiExtract(text) {
  try {
    const prompt = `
You are a receipt parser.

Return ONLY valid JSON.

Schema:
{
  "amount": string|null,
  "merchant": string|null,
  "balance": string|null,
  "reference": string|null
}

TEXT:
${text}
`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: "application/json"
          }
        }),
      }
    );

    const data = await res.json();

    console.log("FULL GEMINI RESPONSE:", JSON.stringify(data, null, 2));

    if (data.error) {
      console.error("Gemini API Error:", data.error.message);
      return null;
    }

    const raw =
      data?.candidates?.[0]?.content?.parts?.find(p => p.text)?.text || null;

    console.log("RAW GEMINI OUTPUT:", raw);

    if (!raw) return null;

    try {
      return JSON.parse(raw.trim());
    } catch (e) {
      console.error("Invalid JSON from Gemini:", raw);
      return null;
    }

  } catch (err) {
    console.error("Gemini parse error:", err.message);
    return null;
  }
}

module.exports = { geminiExtract };