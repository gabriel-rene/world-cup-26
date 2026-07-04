import Link from "next/link";
import { getMeta } from "@/lib/snapshot";

export default function About() {
  const meta = getMeta();
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>Methodology</h1>
      <p><Link href="/">← Home</Link></p>
      <p>
        This site shows <strong>fun</strong> correlations between {meta.tournament} football
        data and public country data. They are descriptive, not predictive.
      </p>
      <h2>Caveats</h2>
      <ul>{meta.caveats.map((c) => <li key={c}>{c}</li>)}</ul>
      <h2>Sources</h2>
      <ul>
        {meta.sources.map((s) => (
          <li key={s.name}><a href={s.url}>{s.name}</a></li>
        ))}
      </ul>
      <p style={{ color: "#777", fontSize: 13 }}>Snapshot generated: {meta.generatedAt}</p>
    </main>
  );
}
