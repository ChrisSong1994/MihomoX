import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

const intlMiddleware = createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'zh'],

  // Used when no locale matches
  defaultLocale: 'zh',
  
  // Use a locale prefix in the URL as needed
  localePrefix: 'as-needed'
});

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // For the root path, check if we should redirect based on persisted settings
  if (pathname === '/') {
    try {
      const settingsPath = path.join(process.cwd(), 'config', 'settings.json');
      if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        if (settings.locale && (settings.locale === 'en' || settings.locale === 'zh')) {
          // If we have a persisted locale, and it's not the default or current, we could redirect
          // But next-intl middleware already handles cookie-based locale detection well.
          // The most important thing is that the cookie is set.
        }
      }
    } catch (e) {
      // Ignore errors in middleware file reading
    }
  }

  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except for
  // - /api, /mihomo-api (API routes)
  // - /_next (Next.js internals)
  // - /static (static files)
  // - /_vercel (Vercel internals)
  // - /favicon.ico, /sitemap.xml, /robots.txt (static files)
  matcher: ['/((?!api|mihomo-api|_next|static|_vercel|[\\w-]+\\.\\w+).*)']
};
