import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { securityMiddleware } from '@/lib/security';

// 明确指定使用 Node.js Runtime（非 Edge）
export const runtime = 'nodejs';

const intlMiddleware = createMiddleware({
  locales: ['en', 'zh'],
  defaultLocale: 'zh',
  localePrefix: 'always'
});

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. 应用安全中间件
  const securityResponse = securityMiddleware(request);
  
  // 如果 securityMiddleware 返回了错误响应，直接返回
  if (securityResponse instanceof Response && !securityResponse.ok) {
    return securityResponse;
  }
  
  // 2. 设置路径名 Header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  // 3. 检查认证状态
  const authToken = request.cookies.get('auth_token')?.value;
  
  let isAuthenticated = false;
  if (authToken) {
    const payload = await verifyToken(authToken);
    isAuthenticated = !!payload && !!payload.username;
  }

  // 4. 获取语言前缀
  const localeMatch = pathname.match(/^\/(zh|en)(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : '';
  const purePathname = locale ? pathname.replace(/^\/(zh|en)/, '') : pathname;

  // 5. 处理登录页面访问
  if (purePathname === '/login') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL(`/${locale || 'zh'}`, request.url));
    }
  } else {
    // 6. 保护其他页面
    if (!isAuthenticated) {
      const loginUrl = new URL(`/${locale || 'zh'}/login`, request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 7. 执行 intl 中间件
  const response = intlMiddleware(request);
  response.headers.set('x-pathname', pathname);
  
  // 8. 应用安全头部到最终响应
  Object.entries({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  // 匹配所有页面路由，排除 API、静态文件等
  matcher: [
    '/',
    '/:locale(zh|en)',
    '/:locale(zh|en)/:path*',
    '/login',
  ]
};
