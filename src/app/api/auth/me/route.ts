import { NextResponse } from 'next/server';
import { getUserByUsername, type UserInfo } from '@/lib/users';
import { getCurrentUser } from '@/lib/auth';

/**
 * 获取当前登录用户信息
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // 从数据库获取用户信息
    const dbUser = await getUserByUsername(currentUser.username);
    
    if (!dbUser) {
      return NextResponse.json({ 
        success: true, 
        user: {
          username: currentUser.username,
          role: currentUser.role || 'customer',
          id: 0
        } 
      });
    }

    const { password: _, ...userInfo } = dbUser;
    
    return NextResponse.json({ 
      success: true, 
      user: userInfo 
    });
  } catch (error) {
    console.error('[Auth] Get current user error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
