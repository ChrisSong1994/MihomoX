/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-var-requires, import/no-unresolved */
import { getDatabasePath } from './db-path';

/**
 * 用户角色类型
 */
export type UserRole = 'administrator' | 'customer';

/**
 * 用户接口
 */
export interface User {
  id: number;
  username: string;
  password: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

/**
 * 用户数据（不含密码）
 */
export interface UserInfo {
  id: number;
  username: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

/**
 * SQLite 数据库类型
 */
type SQLiteDatabase = any;

/**
 * 初始化数据库连接
 */
let db: SQLiteDatabase | null = null;

async function getDb(): Promise<SQLiteDatabase> {
  if (db) return db;

  try {
    const dbPath = getDatabasePath();
    console.log(`[DB] Opening database at: ${dbPath}`);
    
    const sqlite = await import('node:sqlite');
    console.log(`[DB] sqlite module loaded, opening...`);
    
    // 直接使用 sqlite.open
    db = await sqlite.open(dbPath);
    console.log(`[DB] Database opened successfully`);

    // 创建用户表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('administrator', 'customer')),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    console.log(`[DB] Users table created`);

    // 检查是否已有管理员用户
    const result = await db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', ['administrator']);
    console.log(`[DB] Admin count:`, result);
    
    if (!result || (result as { count: number }).count === 0) {
      const defaultAdminUsername = process.env.MihomoX_USERNAME || 'MihomoX';
      const defaultAdminPassword = process.env.MihomoX_PASSWORD || 'admin123';
      const hashedPassword = hashPassword(defaultAdminUsername, defaultAdminPassword);

      await db.run(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [defaultAdminUsername, hashedPassword, 'administrator']
      );
      console.log(`[DB] Created default admin user: ${defaultAdminUsername}`);
    }

    console.log(`[DB] Database initialization complete`);
    return db;
  } catch (error) {
    console.error('[DB] Failed to initialize database:', error);
    throw error;
  }
}

/**
 * 简单密码哈希
 */
function hashPassword(username: string, password: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(username + password).digest('hex');
}

/**
 * 验证密码
 */
export function verifyPassword(username: string, password: string, hashedPassword: string): boolean {
  return hashPassword(username, password) === hashedPassword;
}

/**
 * 获取所有用户（不含密码）
 */
export async function getAllUsers(): Promise<UserInfo[]> {
  const database = await getDb();
  const users = await database.all('SELECT id, username, role, created_at, updated_at FROM users ORDER BY id');
  return users as UserInfo[];
}

/**
 * 根据 ID 获取用户
 */
export async function getUserById(id: number): Promise<UserInfo | null> {
  const database = await getDb();
  const user = await database.get('SELECT id, username, role, created_at, updated_at FROM users WHERE id = ?', [id]);
  return (user as UserInfo) || null;
}

/**
 * 根据用户名获取用户（包含密码）
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  const database = await getDb();
  const user = await database.get('SELECT * FROM users WHERE username = ?', [username]);
  return (user as User) || null;
}

/**
 * 创建用户
 */
export async function createUser(username: string, password: string, role: UserRole): Promise<UserInfo | null> {
  const database = await getDb();
  const hashedPassword = hashPassword(username, password);

  try {
    const result = await database.run(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, role]
    );
    
    return getUserById(result.lastInsertRowid as number);
  } catch (error) {
    console.error('[DB] Failed to create user:', error);
    return null;
  }
}

/**
 * 更新用户
 */
export async function updateUser(id: number, data: { username?: string; password?: string; role?: UserRole }): Promise<UserInfo | null> {
  const database = await getDb();
  
  const updates: string[] = [];
  const values: (string | number)[] = [];
  
  if (data.username) {
    updates.push('username = ?');
    values.push(data.username);
  }
  if (data.password) {
    updates.push('password = ?');
    const user = await getUserById(id);
    values.push(hashPassword(user?.username || '', data.password));
  }
  if (data.role) {
    updates.push('role = ?');
    values.push(data.role);
  }
  
  if (updates.length === 0) return getUserById(id);
  
  updates.push("updated_at = datetime('now')");
  values.push(id);
  
  try {
    await database.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    return getUserById(id);
  } catch (error) {
    console.error('[DB] Failed to update user:', error);
    return null;
  }
}

/**
 * 删除用户
 */
export async function deleteUser(id: number): Promise<boolean> {
  const database = await getDb();
  
  try {
    const result = await database.run('DELETE FROM users WHERE id = ?', [id]);
    return (result as { changes: number }).changes > 0;
  } catch (error) {
    console.error('[DB] Failed to delete user:', error);
    return false;
  }
}

/**
 * 验证用户凭据
 */
export async function validateUserCredentials(username: string, password: string): Promise<{ valid: boolean; user?: UserInfo; error?: string }> {
  const user = await getUserByUsername(username);
  
  if (!user) {
    return { valid: false, error: 'Invalid username or password' };
  }
  
  if (!verifyPassword(username, password, user.password)) {
    return { valid: false, error: 'Invalid username or password' };
  }
  
  const { password: _, ...userInfo } = user;
  return { valid: true, user: userInfo };
}
