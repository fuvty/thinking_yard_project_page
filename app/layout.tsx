import type { Metadata } from 'next';
import { basePath, siteURL } from '../config/paths.mjs';
import '../shared/styles/tokens.css';
import '../hub/styles.css';
import '../shared/navigation/styles.css';
import '../shared/ui/styles.css';
const base = basePath();
const url = siteURL();
export const metadata: Metadata = {
  metadataBase: new URL(url),
  title: 'Three Ways to Scale Intelligence | NICS-EFC',
  description: 'A research roadmap for extending the cost-intelligence Pareto frontier through scale, selective computation, and new scaling variables.',
  alternates: { canonical: url },
  icons: { icon: `${base}/icon.svg`, apple: `${base}/apple-touch-icon.png` },
  openGraph: { title: 'Three Ways to Scale Intelligence', type: 'website', url, images: [{url: `${url}og-intelligence.png`, width: 1672, height: 941}] },
  twitter: { card: 'summary_large_image', images: [`${url}og-intelligence.png`] },
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>
    {children}
  </body></html>;
}
