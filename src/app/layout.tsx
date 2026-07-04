import { getMeta } from "@/lib/snapshot";

export const metadata = { title: `${getMeta().tournament} — Fun Correlations` };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
