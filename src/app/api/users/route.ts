import { NextResponse } from 'next/server';
import { getAllUsers, createUser, getUserById, updateUser, deleteUser, getUserByUsername, type UserRole } from '@/lib/users';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

// 创建用户验证 Schema
const createUserSchema = z.object({
  username: z.string().min(1, 'Username is required').max(50, 'Username too long'),
  password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
  role: z.enum(['administrator', 'customer']),
});

// 更新用户验证 Schema
const updateUserSchema = z.object({
  username: z.string().min(1, 'Username is required').max(50, 'Username too long').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.enum(['administrator', 'customer']).optional(),
});

/**
 * 获取所有用户列表
 */
export async function GET() {
  try {
    // 验证管理员权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // 获取当前用户信息以检查角色
    const dbUser = await getUserByUsername(currentUser.username);
    if (!dbUser || dbUser.role !== 'administrator') {
      return NextResponse.json({ success: false, message: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const users = await getAllUsers();
    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('[UserAPI] GET error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * 创建新用户
 */
export async function POST(request: Request) {
  try {
    // 验证管理员权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await getUserByUsername(currentUser.username);
    if (!dbUser || dbUser.role !== 'administrator') {
      return NextResponse.json({ success: false, message: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validation = createUserSchema.safeParse(body);
    
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { success: false, message: firstError?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const { username, password, role } = validation.data;
    const newUser = await createUser(username, password, role as UserRole);

    if (!newUser) {
      return NextResponse.json(
        { success: false, message: 'Username already exists or creation failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    console.error('[UserAPI] POST error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
