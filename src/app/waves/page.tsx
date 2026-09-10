import type { Metadata } from "next";
import Link from "next/link";
import { getWaveMatches } from "@/lib/waves";
import { WaveGallery } from "@/components/waves/WaveGallery";
export const metadata: Metadata = { title: "2026 Momentum Waves — All 104 matches" };
export default function WavesPage() {
  const summaries = getWaveMatches().map(({momentum, goals, ...summary}) => summary);
  return <main><h1 className="page-title">Momentum Waves</h1><p className="page-sub">Every match of the 2026 World Cup, from the opening game to the final. Two team-colored tides follow real match momentum; goals land as ripples. Data via FotMob — see the <Link href="/about">methodology</Link>.</p><WaveGallery matches={summaries} /></main>;
}
