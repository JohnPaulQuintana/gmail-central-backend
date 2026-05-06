const { detectSource } = require("../utils/source.util");
const { parseMaya } = require("../parsers/maya.parser");
const { parseGCash } = require("../parsers/gcash.parser");
const { classifyMerchant } = require("../utils/category.util");
const { normalizeMerchant } = require("../utils/merchant.util");
const { extractDate, parseToISO } = require("../utils/date.util");

function parseReceipt(text) {
  const source = detectSource(text);

  let parsed = null;

  if (source === "MAYA") parsed = parseMaya(text);
  if (source === "GCASH") parsed = parseGCash(text);

  // failed tx
  if (parsed?.status === "failed") {
    return {
      source,
      status: "failed",
      amount: null,
      merchant: null,
      balance: null,
      reference: null,
      transaction_time: new Date().toISOString(),
    };
  }

  // valid parser result
  if (parsed && (parsed.amount || parsed.merchant)) {
    if (parsed.merchant) {
      const normalized = normalizeMerchant(parsed.merchant);
      const classification = classifyMerchant(normalized);

      parsed.category = classification.category;
      parsed.subcategory = classification.subcategory;
    }

    return parsed;
  }

  // fallback
  const amount = text.match(/PHP\s?([\d,]+\.\d{2})/i);

const merchant = text.match(
  /(?:to|from|at)\s+(.+?)(?=\s+via|\n|$)/i
);

const balance = text.match(
  /(?:available\s+)?balance[:\s]+PHP\s?([\d,]+\.\d{2})/i
);

const referenceMatch = text.match(
  /(?:^|\n)\s*(?:ref(?:erence)?\s*(?:no\.?|number)?|trx|transaction\s*ref(?:erence)?)\s*[:#-]?\s*([^\n]+)/i
);

const reference = referenceMatch?.[1]?.trim()?.split(/\s+/)[0] || null;

const rawDate = extractDate(text);

return {
  source,
  amount: amount?.[1]?.replace(/,/g, "") || null,
  merchant: merchant?.[1]?.trim() || null,
  balance: balance?.[1]?.replace(/,/g, "") || null,
  reference,
  raw_date: rawDate,
  transaction_time: parseToISO(rawDate),
};
}

module.exports = { parseReceipt };
