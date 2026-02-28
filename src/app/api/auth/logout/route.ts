import { NextResponse } from 'next/server';

/**
 * 登出接口，清除认证 Cookie
 */
export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // 清除 auth_token Cookie（必须使用与登录时相同的属性才能正确清除）
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,  // 立即过期
    path: '/',
  });

  return response;
}
