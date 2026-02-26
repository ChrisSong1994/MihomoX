import { NextResponse } from 'next/server';

/**
 * 登录接口，验证用户名和密码并设置 Cookie
 */
export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // 从环境变量读取账号密码，若不存在则使用默认值
    const envUsername = process.env.MihomoX_USERNAME || 'MihomoX';
    const envPassword = process.env.MihomoX_PASSWORD || 'admin-123456';

    if (username === envUsername && password === envPassword) {
      const response = NextResponse.json({ success: true });
      
      // 设置认证 Cookie
      // 这里使用一个简单的令牌，后续中间件会进行校验
      response.cookies.set('auth_token', 'MihomoX_authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 天
        path: '/',
      });

      return response;
    }

    return NextResponse.json(
      { success: false, message: 'Invalid credentials' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
