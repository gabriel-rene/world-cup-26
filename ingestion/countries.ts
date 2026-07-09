export const COUNTRY_ISO3: Record<string, string> = {
  USA: "USA",
  "United States": "USA",
  Canada: "CAN",
  Mexico: "MEX",
  Brazil: "BRA",
  Argentina: "ARG",
  France: "FRA",
  England: "GBR",
  Spain: "ESP",
  Germany: "DEU",
  Japan: "JPN",
  Morocco: "MAR",
};

export function toIso3(country: string): string | null {
  if (!country) return null;
  return COUNTRY_ISO3[country.trim()] ?? null;
}
