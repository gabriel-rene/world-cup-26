import { Archivo, IBM_Plex_Mono } from "next/font/google";
import { getMeta } from "@/lib/snapshot";
import { Nav } from "@/components/Nav";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-sans" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-mono",
});

const title = `${getMeta().tournament} — Fun Correlations`;
const description =
  "Playful correlations between World Cup football data and public country data — GDP vs goals, heat vs possession, and other spurious delights. Correlation ≠ causation; that's the fun part.";

export const metadata = {
  title,
  description,
  openGraph: { title, description, type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${plexMono.variable}`}>
      <body>
        <Nav />
        {children}
        <footer className="site-footer"><span>Fun Correlations — An independent football data study.</span><a href="/about">Data, sources & limitations ↗</a></footer>
      </body>
    </html>
  );
}
