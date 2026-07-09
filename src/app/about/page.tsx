import { getMeta } from "@/lib/snapshot";

export default function About() {
  const meta = getMeta();
  return (
    <main className="prose">
      <h1>Methodology</h1>
      <p>
        This site shows <strong>fun</strong> correlations between {meta.tournament} football
        data and public country data. They are descriptive, not predictive.
      </p>
      <p>
        Every correlation carries a plain-language verdict. Strong ones get a{" "}
        <span className="verdict verdict-yellow">suspiciously strong</span> yellow
        card, because on a sample this small, an impressive r is more likely a
        coincidence than a discovery.
      </p>
      <h2>Caveats</h2>
      <ul>{meta.caveats.map((c) => <li key={c}>{c}</li>)}</ul>
      <h2>Sources</h2>
      <ul>
        {meta.sources.map((s) => (
          <li key={s.name}><a href={s.url}>{s.name}</a></li>
        ))}
      </ul>
      <p className="fine">Snapshot generated: {meta.generatedAt}</p>
    </main>
  );
}
