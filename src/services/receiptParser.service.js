const { detectSource } = require("../utils/source.util");
const { parseMaya } = require("../parsers/maya.parser");
const { parseGCash } = require("../parsers/gcash.parser");
const { classifyMerchant } = require("../utils/category.util");
const { normalizeMerchant } = require("../utils/merchant.util");
const { extractDate, parseToISO } = require("../utils/date.util");

function extractReference(text) {
  const lines = text.split("\n").map((l) => l.trim());

  for (const line of lines) {
    const lower = line.toLowerCase();

    // stricter detection
    if (
      lower.startsWith("ref") ||
      lower.startsWith("reference") ||
      lower.startsWith("trx")
    ) {
      const colonIndex = line.indexOf(":");

      if (colonIndex !== -1) {
        const value = line.slice(colonIndex + 1).trim();
        return value.split(/\s+/)[0];
      }
    }
  }

  return null;
}

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
    // ✅ FIX reference
    if (!parsed.reference || parsed.reference.toLowerCase() === "no") {
      let ref = extractReference(text);

      if (!ref) {
        ref =
          text.match(/MAYA-\d+/i)?.[0] || text.match(/\b\d{8,}\b/)?.[0] || null;
      }

      parsed.reference = ref;
    }

    // classification
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

  const merchantMatch = text.match(
    /(?:to|from|at)\s+(.+?)(?=\s+(?:via|on|php|ref|balance)|\n|$)/i,
  );

  const rawMerchant = merchantMatch?.[1]?.trim() || null;

  let merchantName = rawMerchant;

  if (merchantName) {
    merchantName = merchantName.replace(/\bon\s.+$/i, "");
    merchantName = merchantName.replace(/[.,]$/, "").trim();
  }

  const normalizedMerchant = merchantName
    ? normalizeMerchant(merchantName)
    : null;

  const balance = text.match(
    /(?:available\s+)?balance[:\s]+PHP\s?([\d,]+\.\d{2})/i,
  );

  let reference = extractReference(text);

  // optional fallback for numeric refs (GCash)
  if (!reference) {
    reference = text.match(/\b\d{8,}\b/)?.[0] || null;
  }

  const rawDate = extractDate(text);

  return {
    source,
    amount: amount?.[1]?.replace(/,/g, "") || null,
    merchant: normalizedMerchant,
    merchant_raw: rawMerchant,
    balance: balance?.[1]?.replace(/,/g, "") || null,
    reference,
    raw_date: rawDate,
    transaction_time: parseToISO(rawDate),
  };
}

module.exports = { parseReceipt };
