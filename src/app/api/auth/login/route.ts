import { NextResponse } from 'next/server';
import { createToken, parseLoginRequest } from '@/lib/auth';
import { getUserByUsername, validateUserCredentials } from '@/lib/users';
import { log } from '@/lib/logger';

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

    // 首先尝试从数据库验证用户
    const dbResult = await validateUserCredentials(username, password);
    
    if (dbResult.valid && dbResult.user) {
      // 数据库用户验证成功
      const token = await createToken({
        sub: dbResult.user.username,
        username: dbResult.user.username,
        role: dbResult.user.role,
      });

      const response = NextResponse.json({ 
        success: true,
        message: 'Login successful',
        user: {
          username: dbResult.user.username,
          role: dbResult.user.role,
        }
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
    }

    // 如果数据库中没有用户，尝试环境变量（向后兼容）
    const envUsername = process.env.MihomoX_USERNAME || 'MihomoX';
    const envPassword = process.env.MihomoX_PASSWORD || '';
    
    // 生产环境检查：必须设置密码
    if (process.env.NODE_ENV === 'production' && !envPassword) {
      log.warn('[Auth] SECURITY WARNING: No password set in production environment!');
      return NextResponse.json(
        { success: false, message: 'Server configuration error' },
        { status: 401 }
      );
    }
    
    // 环境变量密码验证
    if (envPassword && username === envUsername && password === envPassword) {
      // 检查数据库中是否有这个用户
      const dbUser = await getUserByUsername(username);
      const role = dbUser?.role || 'administrator';
      
      const token = await createToken({
        sub: username,
        username: username,
        role: role,
      });

      const response = NextResponse.json({ 
        success: true,
        message: 'Login successful',
        user: {
          username: username,
          role: role,
        }
      });
      
      response.cookies.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });

      return response;
    }

    // 环境变量没有设置密码时的向后兼容
    if (!envPassword && username === envUsername && password) {
      const dbUser = await getUserByUsername(username);
      const role = dbUser?.role || 'administrator';
      
      const token = await createToken({
        sub: username,
        username: username,
        role: role,
      });

      log.warn('[Auth] WARNING: Logging in with default configuration. Please set MIHOMO_PASSWORD in production!');

      const response = NextResponse.json({ 
        success: true,
        message: 'Login successful',
        user: {
          username: username,
          role: role,
        }
      });
      
      response.cookies.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });

      return response;
    }
    
    return NextResponse.json(
      { success: false, message: 'Invalid username or password' },
      { status: 401 }
    );
  } catch (error) {
    log.error('[Auth] Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
