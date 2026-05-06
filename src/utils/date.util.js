function extractDate(text) {
  const patterns = [
    /(\d{2}-[A-Za-z]{3}-\d{4}\s\d{1,2}:\d{2}[AP]M)/,
    /(\d{1,2}\/\d{1,2}\/\d{4}\s\d{1,2}:\d{2})/,
  ];

  for (const p of patterns) {
    const match = text.match(p);
    if (match) return match[1];
  }

  return null;
}

function parseToISO(dateStr) {
  if (!dateStr || typeof dateStr !== "string") {
    return null;
  }

  try {
    const cleaned = dateStr
      .replace(/(\d{2})-([A-Za-z]{3})-(\d{4})/, (_, d, m, y) => {
        const months = {
          Jan: "01", Feb: "02", Mar: "03", Apr: "04",
          May: "05", Jun: "06", Jul: "07", Aug: "08",
          Sep: "09", Oct: "10", Nov: "11", Dec: "12",
        };
        return `${y}-${months[m]}-${d}`;
      })
      .replace("AM", " AM")
      .replace("PM", " PM");

    const parsed = new Date(cleaned);

    // 🔥 IMPORTANT SAFETY CHECK
    if (isNaN(parsed.getTime())) {
      return null;
    }

    return parsed.toISOString();
  } catch (err) {
    return null;
  }
}

module.exports = { extractDate, parseToISO };