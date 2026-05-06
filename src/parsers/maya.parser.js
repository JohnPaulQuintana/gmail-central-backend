const { extractDate, parseToISO } = require("../utils/date.util");

function parseMaya(text) {
  if (/failed/i.test(text)) {
    return { status: "failed", source: "MAYA" };
  }

  const amount =
    text.match(/paid\sPHP\s([\d,]+\.\d{2})/i) ||
    text.match(/sent\sPHP\s([\d,]+\.\d{2})/i);

  const merchant =
    text.match(/(?:paid|sent)\sPHP\s[\d,]+\.\d{2}\s+to\s(.+?)(?:\s(via|on|ref|$))/i);

  const balance =
    text.match(/balance[:\s]+PHP\s?([\d,]+\.\d{2})/i);

  const reference =
    text.match(/ref[:\s]+([A-Za-z0-9-]+)/i);

  const raw_date = extractDate(text);

  return {
    source: "MAYA",
    amount: amount?.[1]?.replace(/,/g, "") || null,
    merchant: merchant?.[1]?.trim() || null,
    balance: balance?.[1]?.replace(/,/g, "") || null,
    reference: reference?.[1] || null,
    raw_date,
    transaction_time: parseToISO(raw_date),
  };
}

module.exports = { parseMaya };