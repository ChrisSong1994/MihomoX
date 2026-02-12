import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

const intlMiddleware = createMiddleware({
  // 支持的所有语言列表
  locales: ['en', 'zh'],

  // 当没有匹配到语言时使用的默认语言
  defaultLocale: 'zh',
  
  // 按需在 URL 中使用语言前缀
  localePrefix: 'as-needed'
});

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 针对根路径，根据持久化设置判断是否需要重定向
  if (pathname === '/') {
    try {
      const settingsPath = path.join(process.cwd(), 'config', 'settings.json');
      if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        if (settings.locale && (settings.locale === 'en' || settings.locale === 'zh')) {
          // 如果存在持久化语言设置，且与当前不一致，可以进行重定向
          // 但 next-intl 中间件已能很好地处理基于 Cookie 的语言识别
          // 最关键的是确保已正确设置语言 Cookie
        }
      }
    } catch (e) {
      // 忽略中间件读取文件失败的错误
    }
  }

  return intlMiddleware(request);
}

export const config = {
  // 匹配除以下路径之外的所有路由
  // - /api, /mihomo-api（API 路由）
  // - /_next（Next.js 内部）
  // - /static（静态文件）
  // - /_vercel（Vercel 内部）
  // - /favicon.ico、/sitemap.xml、/robots.txt（静态文件）
  matcher: ['/((?!api|mihomo-api|_next|static|_vercel|[\\w-]+\\.\\w+).*)']
};
