import Script from 'next/script';
import { notFound } from 'next/navigation';
import {renderLanguageNotice} from '../../shared/language/render.mjs';
import ScalingPaths from '../../hub/ScalingPaths';
import { getCopy, homePath, localize, projectPath } from '../../hub/i18n.mjs';
import projects from '../../config/projects.json';
import categories from '../../config/categories.json';
import site from '../../config/site.json';
import { basePath } from '../../config/paths.mjs';
import { renderNavigation } from '../../shared/navigation/render.mjs';
import { renderBackToTop, renderFooter } from '../../shared/ui/render.mjs';

export const dynamicParams = false;
export function generateStaticParams() {
  return [{lang: []}, {lang: ['zh']}];
}

export default async function Page({params}: {params: Promise<{lang?: string[]}>}) {
  const {lang = []} = await params;
  if (lang.length > 1 || (lang.length === 1 && lang[0] !== 'zh')) notFound();
  const locale = lang[0] === 'zh' ? 'zh' : 'en';
  const copy = getCopy(locale);
  const base = basePath();
  const homeHref = homePath(locale, base);
  const languageSwitch = {locale, englishHref: homePath('en', base), chineseHref: homePath('zh', base)};
  return <>
    <div dangerouslySetInnerHTML={{__html: renderLanguageNotice(languageSwitch.chineseHref)}} />
    <div dangerouslySetInnerHTML={{__html: renderNavigation({
      projects: projects.map(project => ({...localize(project, locale), href:projectPath(project, locale, base)})),
      categories: categories.map(category => localize(category, locale)),
      name: site.name, sections: site.hubSections.map(section => localize(section, locale)),
      base, homeHref, labels: copy.navigation, groupLabels: copy.groupLabels,
    })}} />
    <ScalingPaths locale={locale} />
    <div dangerouslySetInnerHTML={{__html: renderFooter({base, name:site.name, team:site.team, homeHref, labels:copy.footer, languageSwitch, contact:{label:copy.contactTitle, email:site.contactEmail}})}} />
    <div dangerouslySetInnerHTML={{__html: renderBackToTop(copy.backToTop)}} />
    <Script src={`${base}/shared/navigation/controller.js`} strategy="afterInteractive" />
    <Script src={`${base}/shared/ui/controller.js`} strategy="afterInteractive" />
    <Script src={`${base}/shared/language/controller.js`} type="module" strategy="afterInteractive" />
  </>;
}
