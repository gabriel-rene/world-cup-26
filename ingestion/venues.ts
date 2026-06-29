export interface VenueCoord {
  name: string;
  lat: number;
  lon: number;
}

// Keyed by lowercased venue name and city. Coordinates are venue locations.
export const VENUES: Record<string, VenueCoord> = {
  // United States
  "metlife stadium": { name: "MetLife Stadium", lat: 40.8135, lon: -74.0745 },
  "east rutherford": { name: "MetLife Stadium", lat: 40.8135, lon: -74.0745 },
  "new york": { name: "MetLife Stadium", lat: 40.8135, lon: -74.0745 },
  "sofi stadium": { name: "SoFi Stadium", lat: 33.9535, lon: -118.3392 },
  "los angeles": { name: "SoFi Stadium", lat: 33.9535, lon: -118.3392 },
  "at&t stadium": { name: "AT&T Stadium", lat: 32.7473, lon: -97.0945 },
  "dallas": { name: "AT&T Stadium", lat: 32.7473, lon: -97.0945 },
  "nrg stadium": { name: "NRG Stadium", lat: 29.6847, lon: -95.4107 },
  "houston": { name: "NRG Stadium", lat: 29.6847, lon: -95.4107 },
  "arrowhead stadium": { name: "Arrowhead Stadium", lat: 39.0489, lon: -94.4839 },
  "kansas city": { name: "Arrowhead Stadium", lat: 39.0489, lon: -94.4839 },
  "mercedes-benz stadium": { name: "Mercedes-Benz Stadium", lat: 33.7554, lon: -84.4008 },
  "atlanta": { name: "Mercedes-Benz Stadium", lat: 33.7554, lon: -84.4008 },
  "hard rock stadium": { name: "Hard Rock Stadium", lat: 25.958, lon: -80.2389 },
  "miami": { name: "Hard Rock Stadium", lat: 25.958, lon: -80.2389 },
  "lincoln financial field": { name: "Lincoln Financial Field", lat: 39.9008, lon: -75.1675 },
  "philadelphia": { name: "Lincoln Financial Field", lat: 39.9008, lon: -75.1675 },
  "gillette stadium": { name: "Gillette Stadium", lat: 42.0909, lon: -71.2643 },
  "foxborough": { name: "Gillette Stadium", lat: 42.0909, lon: -71.2643 },
  "boston": { name: "Gillette Stadium", lat: 42.0909, lon: -71.2643 },
  "lumen field": { name: "Lumen Field", lat: 47.5952, lon: -122.3316 },
  "seattle": { name: "Lumen Field", lat: 47.5952, lon: -122.3316 },
  "levi's stadium": { name: "Levi's Stadium", lat: 37.403, lon: -121.9698 },
  "santa clara": { name: "Levi's Stadium", lat: 37.403, lon: -121.9698 },
  "san francisco": { name: "Levi's Stadium", lat: 37.403, lon: -121.9698 },
  // Canada
  "bmo field": { name: "BMO Field", lat: 43.6332, lon: -79.4185 },
  "toronto": { name: "BMO Field", lat: 43.6332, lon: -79.4185 },
  "bc place": { name: "BC Place", lat: 49.2768, lon: -123.1119 },
  "vancouver": { name: "BC Place", lat: 49.2768, lon: -123.1119 },
  // Mexico
  "estadio azteca": { name: "Estadio Azteca", lat: 19.3029, lon: -99.1505 },
  "mexico city": { name: "Estadio Azteca", lat: 19.3029, lon: -99.1505 },
  "estadio akron": { name: "Estadio Akron", lat: 20.6817, lon: -103.4626 },
  "guadalajara": { name: "Estadio Akron", lat: 20.6817, lon: -103.4626 },
  "estadio bbva": { name: "Estadio BBVA", lat: 25.6694, lon: -100.2444 },
  "monterrey": { name: "Estadio BBVA", lat: 25.6694, lon: -100.2444 },
};

export function lookupVenue(name: string): VenueCoord | null {
  if (!name) return null;
  return VENUES[name.trim().toLowerCase()] ?? null;
}
