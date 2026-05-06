const { extractDate, parseToISO } = require("../utils/date.util");

function parseGCash(text) {
  if (/failed/i.test(text)) {
    return { status: "failed", source: "GCASH" };
  }

  const amount = text.match(/PHP\s?([\d,]+\.\d{2})/i);

  const merchant =
    text.match(/(?:paid to|sent to|to)\s(.+?)(?:\s|$)/i);

  const balance =
    text.match(/balance[:\s]+PHP\s?([\d,]+\.\d{2})/i);

  const reference =
    text.match(/ref[:\s]+([A-Za-z0-9]+)/i);

  const raw_date = extractDate(text);

  return {
    source: "GCASH",
    amount: amount?.[1]?.replace(/,/g, "") || null,
    merchant: merchant?.[1]?.trim() || null,
    balance: balance?.[1]?.replace(/,/g, "") || null,
    reference: reference?.[1] || null,
    raw_date,
    transaction_time: parseToISO(raw_date),
  };
}

module.exports = { parseGCash };