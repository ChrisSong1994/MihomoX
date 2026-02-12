import { NextResponse } from 'next/server';

/**
 * 登出接口，清除认证 Cookie
 */
export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // 清除 auth_token Cookie
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });

  return response;
}
