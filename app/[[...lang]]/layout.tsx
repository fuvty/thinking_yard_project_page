import type { Metadata } from 'next';
import { basePath, siteURL } from '../../config/paths.mjs';
import { getCopy } from '../../hub/i18n.mjs';
import '../../shared/styles/tokens.css';
import '../../hub/styles.css';
import '../../shared/navigation/styles.css';
import '../../shared/ui/styles.css';
import '../../shared/language/styles.css';

type Props = {children: React.ReactNode; params: Promise<{lang?: string[]}>};
export async function generateMetadata({params}: Props): Promise<Metadata> {
  const locale = (await params).lang?.[0] === 'zh' ? 'zh' : 'en';
  const copy = getCopy(locale);
  const base = basePath();
  const root = siteURL();
  const url = `${root}${locale === 'zh' ? 'zh/' : ''}`;
  return {
    metadataBase: new URL(root),
    title: `${copy.title} | NICS-EFC`, description: copy.description,
    alternates: {canonical: url, languages: {'en': root, 'zh-CN': `${root}zh/`, 'x-default': root}},
    icons: {icon: `${base}/icon.svg`, apple: `${base}/apple-touch-icon.png`},
    openGraph: {title: copy.title, description: copy.description, type: 'website', url,
      locale: locale === 'zh' ? 'zh_CN' : 'en_US', alternateLocale: locale === 'zh' ? 'en_US' : 'zh_CN',
      images: [{url: `${root}og-intelligence.png`, width: 1672, height: 941}]},
    twitter: {card: 'summary_large_image', images: [`${root}og-intelligence.png`]},
  };
}
export default async function RootLayout({children, params}: Readonly<Props>) {
  const locale = (await params).lang?.[0] === 'zh' ? 'zh-CN' : 'en';
  return <html lang={locale}><body>{children}</body></html>;
}
