export const COUNTRY_ISO3: Record<string, string> = {
  // CONCACAF (hosts + qualifiers)
  USA: "USA", "United States": "USA", Canada: "CAN", Mexico: "MEX",
  "Costa Rica": "CRI", Jamaica: "JAM", Panama: "PAN", Honduras: "HND",
  // CONMEBOL
  Brazil: "BRA", Argentina: "ARG", Uruguay: "URY", Colombia: "COL",
  Ecuador: "ECU", Chile: "CHL", Peru: "PER", Paraguay: "PRY",
  Venezuela: "VEN", Bolivia: "BOL",
  // UEFA
  France: "FRA", England: "GBR", Wales: "GBR", Scotland: "GBR",
  Spain: "ESP", Germany: "DEU", Portugal: "PRT", Netherlands: "NLD",
  Italy: "ITA", Belgium: "BEL", Croatia: "HRV", Switzerland: "CHE",
  Denmark: "DNK", Poland: "POL", Serbia: "SRB", Austria: "AUT",
  Ukraine: "UKR", Sweden: "SWE", Turkey: "TUR", "Türkiye": "TUR",
  Norway: "NOR",
  // CAF
  Morocco: "MAR", Senegal: "SEN", Nigeria: "NGA", Cameroon: "CMR",
  Ghana: "GHA", Egypt: "EGY", Tunisia: "TUN", Algeria: "DZA",
  "Ivory Coast": "CIV", "Cote d'Ivoire": "CIV", "Côte d'Ivoire": "CIV",
  Mali: "MLI", "South Africa": "ZAF",
  // AFC
  Japan: "JPN", "South Korea": "KOR", "Korea Republic": "KOR",
  Australia: "AUS", Iran: "IRN", "Saudi Arabia": "SAU", Qatar: "QAT",
  Iraq: "IRQ", "United Arab Emirates": "ARE", Uzbekistan: "UZB",
  // OFC
  "New Zealand": "NZL",
};

export function toIso3(country: string): string | null {
  if (!country) return null;
  return COUNTRY_ISO3[country.trim()] ?? null;
}
