import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WavePortrait } from "@/components/waves/WavePortrait";
import { getWaveMatch, getWaveMatches } from "@/lib/waves";

export function generateStaticParams() {
  return getWaveMatches().map((match) => ({ matchId: match.matchId }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ matchId: string }>;
}): Promise<Metadata> {
  const { matchId } = await params;
  const match = getWaveMatch(matchId);
  return {
    title: match
      ? `${match.home.name} v ${match.away.name} — Momentum Waves`
      : "Momentum Waves",
  };
}

export default async function WaveMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const match = getWaveMatch(matchId);
  if (!match) notFound();
  return <WavePortrait match={match} />;
}
