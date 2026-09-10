// ISO 3166 alpha-3 -> alpha-2 for nations that may appear in the snapshot.
// Stable reference data; unrelated to who actually qualified.
const ISO3_TO_ISO2: Record<string, string> = {
  HTI: "HT", CUW: "CW", CPV: "CV", COD: "CD", JOR: "JO", CZE: "CZ", BIH: "BA",
  // CONCACAF (incl. hosts)
  USA: "US", CAN: "CA", MEX: "MX", CRI: "CR", JAM: "JM", PAN: "PA", HND: "HN",
  // CONMEBOL
  BRA: "BR", ARG: "AR", URY: "UY", COL: "CO", ECU: "EC", CHL: "CL", PER: "PE",
  PRY: "PY", VEN: "VE", BOL: "BO",
  // UEFA
  FRA: "FR", GBR: "GB", ESP: "ES", DEU: "DE", PRT: "PT", NLD: "NL", ITA: "IT",
  BEL: "BE", HRV: "HR", CHE: "CH", DNK: "DK", POL: "PL", SRB: "RS", AUT: "AT",
  UKR: "UA", SWE: "SE", TUR: "TR", NOR: "NO",
  // CAF
  MAR: "MA", SEN: "SN", NGA: "NG", CMR: "CM", GHA: "GH", EGY: "EG", TUN: "TN",
  DZA: "DZ", CIV: "CI", MLI: "ML", ZAF: "ZA",
  // AFC
  JPN: "JP", KOR: "KR", AUS: "AU", IRN: "IR", SAU: "SA", QAT: "QA", IRQ: "IQ",
  ARE: "AE", UZB: "UZ",
  // OFC
  NZL: "NZ",
};

const REGIONAL_INDICATOR_A = 0x1f1e6; // 🇦
const PLACEHOLDER = "🏳️";

export function flagEmoji(iso3: string): string {
  if (iso3 === "SCO") return "🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}";
  if (iso3 === "ENG") return "🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}";
  const iso2 = ISO3_TO_ISO2[(iso3 ?? "").trim().toUpperCase()];
  if (!iso2) return PLACEHOLDER;
  const codePoints = [...iso2].map(
    (ch) => REGIONAL_INDICATOR_A + (ch.charCodeAt(0) - 65),
  );
  return String.fromCodePoint(...codePoints);
}
