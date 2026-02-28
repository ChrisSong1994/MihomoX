import { NextResponse } from 'next/server';
import { getUserById, updateUser, deleteUser, getUserByUsername, type UserRole } from '@/lib/users';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

// 更新用户验证 Schema
const updateUserSchema = z.object({
  username: z.string().min(1, 'Username is required').max(50, 'Username too long').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.enum(['administrator', 'customer']).optional(),
});

/**
 * 获取单个用户
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, message: 'Invalid user ID' }, { status: 400 });
    }

    // 验证用户权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await getUserByUsername(currentUser.username);
    if (!dbUser) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // 管理员可以查看任何用户，客户只能查看自己
    if (dbUser.role !== 'administrator' && dbUser.id !== userId) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('[UserAPI] GET single error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * 更新用户
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, message: 'Invalid user ID' }, { status: 400 });
    }

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
    const validation = updateUserSchema.safeParse(body);
    
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { success: false, message: firstError?.message || 'Validation error' },
        { status: 400 }
      );
    }

    // 检查目标用户是否存在
    const targetUser = await getUserById(userId);
    if (!targetUser) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const updatedUser = await updateUser(userId, validation.data);
    if (!updatedUser) {
      return NextResponse.json({ success: false, message: 'Update failed' }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('[UserAPI] PUT error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * 删除用户
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, message: 'Invalid user ID' }, { status: 400 });
    }

    // 验证管理员权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await getUserByUsername(currentUser.username);
    if (!dbUser || dbUser.role !== 'administrator') {
      return NextResponse.json({ success: false, message: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 管理员不能删除自己
    if (dbUser.id === userId) {
      return NextResponse.json({ success: false, message: 'Cannot delete yourself' }, { status: 400 });
    }

    // 检查目标用户是否存在
    const targetUser = await getUserById(userId);
    if (!targetUser) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const deleted = await deleteUser(userId);
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Delete failed' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('[UserAPI] DELETE error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
