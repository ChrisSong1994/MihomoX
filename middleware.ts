import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

  // 1. 设置路径名 Header，以便在 Layout 中判断
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  // 2. 检查认证状态
  const authToken = request.cookies.get('auth_token')?.value;
  const isAuthenticated = authToken === 'MihomoX_authenticated';

  // 获取语言前缀（如果有）
  const localeMatch = pathname.match(/^\/(zh|en)(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : '';
  const purePathname = locale ? pathname.replace(/^\/(zh|en)/, '') : pathname;

  // 3. 处理登录页面访问
  if (purePathname === '/login') {
    // 如果已登录且访问登录页，重定向到首页
    if (isAuthenticated) {
      return NextResponse.redirect(new URL(`/${locale || 'zh'}`, request.url));
    }
    // 未登录访问登录页，允许通过
  } else {
    // 4. 保护其他页面，未登录则重定向到登录页
    if (!isAuthenticated) {
      const loginUrl = new URL(`/${locale || 'zh'}/login`, request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 5. 针对根路径，让 next-intl 自动处理语言重定向
  // Middleware 环境不支持 Node.js fs/path 模块，因此无法在此读取 settings.json
  // next-intl 会根据浏览器 Accept-Language 或 Cookie 自动处理默认语言
  
  // 执行 intl 中间件并传入修改后的 Headers
  const response = intlMiddleware(request);
  response.headers.set('x-pathname', pathname);
  return response;
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
