import type { WaveMatch } from "./waves-types";
import jpnEsp from "../../public/data/waves/jpn-esp-group.json";
import croBra from "../../public/data/waves/cro-bra-qf.json";
import nedArg from "../../public/data/waves/ned-arg-qf.json";
import argFra from "../../public/data/waves/arg-fra-final.json";

// Chronological. The double cast is needed because JSON imports widen
// literal fields like side: "home" to string.
const MATCHES = [jpnEsp, croBra, nedArg, argFra] as unknown as WaveMatch[];

export function getWaveMatches(): WaveMatch[] {
  return MATCHES;
}

export function getWaveMatch(slug: string): WaveMatch | undefined {
  return MATCHES.find((m) => m.matchId === slug);
}
