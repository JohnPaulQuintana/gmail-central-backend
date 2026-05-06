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
  if (!dateStr) return new Date().toISOString();
  return new Date(dateStr).toISOString();
}

module.exports = { extractDate, parseToISO };