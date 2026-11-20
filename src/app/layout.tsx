import type { Metadata } from 'next';
import './globals.css';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { LocaleProvider } from '@/components/ui/LocaleProvider';
import { getConfig } from '@/lib/config';
import { getRuntimeI18nConfig } from '@/lib/i18n/config';
import type { SiteConfig } from '@/lib/config';

export async function generateMetadata(): Promise<Metadata> {
  const config = getConfig();
  const runtimeI18n = getRuntimeI18nConfig(config.i18n);
  const openGraphLocale = runtimeI18n.defaultLocale === 'zh' ? 'zh_CN' : 'en_US';

  return {
    title: {
      default: config.site.title,
      template: `%s | ${config.site.title}`,
    },
    description: config.site.description,
    keywords: [config.author.name, 'PhD', 'Research', config.author.institution],
    authors: [{ name: config.author.name }],
    creator: config.author.name,
    publisher: config.author.name,
    icons: {
      icon: [
        { url: config.site.favicon, type: 'image/svg+xml' },
        { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
        { url: '/favicon.ico', sizes: 'any' },
      ],
      apple: '/apple-touch-icon.png',
    },
    openGraph: {
      type: 'website',
      locale: openGraphLocale,
      title: config.site.title,
      description: config.site.description,
      siteName: `${config.author.name}'s Academic Website`,
    },
  };
}

function buildLocaleBootstrapScript(config: ReturnType<typeof getRuntimeI18nConfig>): string {
  const serializedConfig = JSON.stringify(config).replace(/</g, '\\u003c');

  return `
    try {
      const cfg = ${serializedConfig};
      const storageKey = 'locale-storage-v2';
      const normalize = (value) => typeof value === 'string' ? value.trim().replace('_', '-').toLowerCase() : '';
      const matchLocale = (candidate) => {
        const normalized = normalize(candidate);
        if (!normalized) return null;
        if (cfg.locales.includes(normalized)) return normalized;
        const language = normalized.split('-')[0];
        if (cfg.locales.includes(language)) return language;
        return null;
      };

      let resolved = null;

      if (cfg.persist) {
        resolved = matchLocale(localStorage.getItem(storageKey));
      }

      if (!resolved) {
        if (cfg.mode === 'fixed') {
          resolved = cfg.fixedLocale;
        } else {
          resolved = matchLocale(navigator.language);
        }
      }

      if (!resolved) {
        resolved = cfg.defaultLocale;
      }

      const root = document.documentElement;
      root.lang = resolved;
      root.setAttribute('data-locale', resolved);

      if (cfg.persist) {
        localStorage.setItem(storageKey, resolved);
      }
    } catch (e) {
      const root = document.documentElement;
      root.lang = '${config.defaultLocale}';
      root.setAttribute('data-locale', '${config.defaultLocale}');
    }
  `;
}

function buildLocalizedConfigMaps(
  locales: string[]
): {
  navigationByLocale: Record<string, SiteConfig['navigation']>;
  siteTitleByLocale: Record<string, string>;
  lastUpdatedByLocale: Record<string, string | undefined>;
} {
  const navigationByLocale: Record<string, SiteConfig['navigation']> = {};
  const siteTitleByLocale: Record<string, string> = {};
  const lastUpdatedByLocale: Record<string, string | undefined> = {};

  for (const locale of locales) {
    const localizedConfig = getConfig(locale);
    navigationByLocale[locale] = localizedConfig.navigation;
    siteTitleByLocale[locale] = localizedConfig.site.title;
    lastUpdatedByLocale[locale] = localizedConfig.site.last_updated;
  }

  return {
    navigationByLocale,
    siteTitleByLocale,
    lastUpdatedByLocale,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = getConfig();
  const gaId = config.analytics?.google_analytics_id?.trim();
  const goatCode = config.analytics?.goatcounter_code?.trim();
  const mapToken = config.analytics?.mapmyvisitors_id?.trim();
  const runtimeI18n = getRuntimeI18nConfig(config.i18n);
  const targetLocales = runtimeI18n.enabled ? runtimeI18n.locales : [runtimeI18n.defaultLocale];

  const {
    navigationByLocale,
    siteTitleByLocale,
    lastUpdatedByLocale,
  } = buildLocalizedConfigMaps(targetLocales);

  return (
    <html lang={runtimeI18n.defaultLocale} className="scroll-smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme-storage-v2');
                const parsed = theme ? JSON.parse(theme) : null;
                const setting = parsed?.state?.theme || 'light';
                const effective = setting === 'dark' ? 'dark' : 'light';
                var root = document.documentElement;
                root.classList.add(effective);
                root.setAttribute('data-theme', effective);
              } catch (e) {
                var root = document.documentElement;
                root.classList.add('light');
                root.setAttribute('data-theme', 'light');
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: buildLocaleBootstrapScript(runtimeI18n),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `try { var t = new URLSearchParams(location.search).get('theme'); if (t === 'dark' || t === 'light') { localStorage.setItem('theme-storage-v2', JSON.stringify({ state: { theme: t }, version: 0 })); var r = document.documentElement; r.classList.remove('dark', 'light'); r.classList.add(t); r.setAttribute('data-theme', t); } } catch (e) {}`,
          }}
        />
        {/* GoatCounter — one request per page view, no cookies, nothing rendered.
            Injected from an inline script for the same reason as GA below: the App
            Router keeps <script src> elements out of the exported HTML. count.js reads
            its endpoint from window.goatcounter, so setting that first is enough. */}
        {goatCode && (
          <script
            dangerouslySetInnerHTML={{
              __html: `window.goatcounter = { endpoint: 'https://' + ${JSON.stringify(goatCode)} + '.goatcounter.com/count' }; (function(){var s=document.createElement('script'); s.async=true; s.src='https://gc.zgo.at/count.js'; s.setAttribute('data-goatcounter', window.goatcounter.endpoint); document.head.appendChild(s);})();`,
            }}
          />
        )}
        {/* Google Analytics 4 — no visible widget; the stats live in the GA dashboard.
            The loader is appended by this inline script rather than written as a
            <script src> element, because the App Router keeps such elements in the RSC
            payload instead of the exported HTML. gtag queues into dataLayer until the
            library arrives, exactly as Google's own snippet does. */}
        {gaId && (
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', ${JSON.stringify(gaId)}); (function(){var s=document.createElement('script'); s.async=true; s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(${JSON.stringify(gaId)}); document.head.appendChild(s);})();`,
            }}
          />
        )}
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <LocaleProvider config={runtimeI18n}>
            <Navigation
              items={config.navigation}
              siteTitle={config.site.title}
              enableOnePageMode={config.features.enable_one_page_mode}
              i18n={runtimeI18n}
              itemsByLocale={navigationByLocale}
              siteTitleByLocale={siteTitleByLocale}
            />
            <main className="min-h-screen pt-16 lg:pt-20">
              {children}
            </main>
            <Footer
              lastUpdated={config.site.last_updated}
              lastUpdatedByLocale={lastUpdatedByLocale}
              defaultLocale={runtimeI18n.defaultLocale}
            />
          </LocaleProvider>
        </ThemeProvider>
        {/* MapMyVisitors (ex-ClustrMaps), deliberately without its map widget.
            map.js is the beacon itself — it is served no-store and carries the site
            token, so the visit registers even though nothing is drawn. The script is
            appended into a hidden host rather than written inline, both because the
            App Router drops <script src> from the export and because a dynamically
            created script is async and so never blocks the page on its 72 KB. */}
        {mapToken && (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){var h=document.createElement('div'); h.id='mmv-host'; h.setAttribute('aria-hidden','true'); h.style.display='none'; document.body.appendChild(h); var s=document.createElement('script'); s.type='text/javascript'; s.id='mapmyvisitors'; s.src='https://mapmyvisitors.com/map.js?cl=ffffff&w=a&t=tt&d='+encodeURIComponent(${JSON.stringify(mapToken)}); h.appendChild(s);})();`,
            }}
          />
        )}
      </body>
    </html>
  );
}
