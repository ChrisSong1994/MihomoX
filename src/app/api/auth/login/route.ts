import { NextResponse } from 'next/server';
import { createToken, validateCredentials, parseLoginRequest } from '@/lib/auth';

/**
 * 登录接口，验证用户名和密码并设置安全的 Cookie
 */
export async function POST(request: Request) {
  try {
    // 解析并验证请求体
    const body = await request.json();
    const parseResult = parseLoginRequest(body);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: parseResult.error },
        { status: 400 }
      );
    }

    const { username, password } = parseResult.data;

    // 验证凭据
    const result = validateCredentials(username, password);
    
    if (!result.valid) {
      return NextResponse.json(
        { success: false, message: result.error || 'Invalid credentials' },
        { status: 401 }
      );
    }

    // 生成 JWT token
    const token = await createToken({
      sub: result.user,
      username: result.user,
    });

    const response = NextResponse.json({ 
      success: true,
      message: 'Login successful'
    });
    
    // 设置安全的认证 Cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 天
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
