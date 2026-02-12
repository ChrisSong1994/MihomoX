import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'zh'],

  // Used when no locale matches
  defaultLocale: 'zh',
  
  // Don't use a locale prefix in the URL
  localePrefix: 'never'
});

export const config = {
  // Match all pathnames except for
  // - /api, /mihomo-api (API routes)
  // - /_next (Next.js internals)
  // - /static (static files)
  // - /_vercel (Vercel internals)
  // - /favicon.ico, /sitemap.xml, /robots.txt (static files)
  matcher: ['/((?!api|mihomo-api|_next|static|_vercel|[\\w-]+\\.\\w+).*)']
};
