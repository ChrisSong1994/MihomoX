/**
 * 安全中间件 - 添加安全响应头
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 安全头部配置
 */
const securityHeaders = {
  // 防止 XSS 攻击
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  
  // 防止点击劫持
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // 内容安全策略 (CSP)
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js 需要
    "style-src 'self' 'unsafe-inline'", // Tailwind 需要
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' http://127.0.0.1:* ws://127.0.0.1:*",
    "frame-ancestors 'none'",
  ].join('; '),
  
  // HSTS (仅在生产环境启用)
  ...(process.env.NODE_ENV === 'production' && {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  }),
};

/**
 * Rate limiting 简单实现
 * 生产环境建议使用 Redis 或专业服务
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // 请求次数限制
const RATE_WINDOW = 60 * 1000; // 时间窗口 (1分钟)

/**
 * 检查速率限制
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    // 新窗口
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    // 超出限制
    return false;
  }
  
  // 增加计数
  record.count++;
  return true;
}

/**
 * 获取客户端 IP
 */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * 安全中间件主函数
 */
export function securityMiddleware(request: NextRequest) {
  const response = NextResponse.next();
  const clientIp = getClientIp(request);
  
  // 添加安全头部
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // 速率限制 (仅对 API 路径)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // 排除健康检查等特定端点
    const exemptPaths = ['/api/health', '/api/stats'];
    const isExempt = exemptPaths.some(path => request.nextUrl.pathname.startsWith(path));
    
    if (!isExempt) {
      if (!checkRateLimit(clientIp)) {
        return Response.json(
          { success: false, error: 'Too many requests' },
          { status: 429, headers: { 'Retry-After': '60' } }
        );
      }
    }
  }
  
  return response;
}

/**
 * 应用安全中间件到响应
 */
export function withSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
