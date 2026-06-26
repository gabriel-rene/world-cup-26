export interface VenueCoord {
  name: string;
  lat: number;
  lon: number;
}

// Keyed by lowercased venue name and city. Coordinates are venue locations.
export const VENUES: Record<string, VenueCoord> = {
  "metlife stadium": {
    name: "MetLife Stadium",
    lat: 40.8135,
    lon: -74.0745,
  },
  "east rutherford": {
    name: "MetLife Stadium",
    lat: 40.8135,
    lon: -74.0745,
  },
  "sofi stadium": {
    name: "SoFi Stadium",
    lat: 33.9535,
    lon: -118.3392,
  },
  "los angeles": {
    name: "SoFi Stadium",
    lat: 33.9535,
    lon: -118.3392,
  },
  "estadio azteca": {
    name: "Estadio Azteca",
    lat: 19.3029,
    lon: -99.1505,
  },
  "mexico city": {
    name: "Estadio Azteca",
    lat: 19.3029,
    lon: -99.1505,
  },
  "bmo field": {
    name: "BMO Field",
    lat: 43.6332,
    lon: -79.4185,
  },
  "toronto": {
    name: "BMO Field",
    lat: 43.6332,
    lon: -79.4185,
  },
};

export function lookupVenue(name: string): VenueCoord | null {
  if (!name) return null;
  return VENUES[name.trim().toLowerCase()] ?? null;
}
