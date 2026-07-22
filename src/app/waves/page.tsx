import type { Metadata } from "next";
import Link from "next/link";
import { flagEmoji } from "@/lib/flags";
import { getWaveMatches } from "@/lib/waves";

export const metadata: Metadata = { title: "Momentum Waves" };

export default function WavesPage() {
  return (
    <main className="prose">
      <h1>Momentum Waves</h1>
      <p>
        Each match rendered as a tide of momentum: two team-colored waters meet along a moving
        front, and goals land as ripples. Data via FotMob—see the{" "}
        <Link href="/about">methodology</Link>.
      </p>
      <div className="waves-gallery">
        {getWaveMatches().map((match) => (
          <Link key={match.matchId} href={`/waves/${match.matchId}`} className="waves-card">
            <div className="waves-card-score">
              {flagEmoji(match.home.code)} {match.score[0]} – {match.score[1]}{" "}
              {flagEmoji(match.away.code)}
            </div>
            <div>
              {match.home.name} v {match.away.name}
            </div>
            <div className="waves-card-stage">
              {match.stage}
              {match.penalties ? ` · ${match.penalties[0]}–${match.penalties[1]} pens` : ""}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
