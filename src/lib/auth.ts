import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { z } from 'zod';

// 简单的空操作 logger（兼容 Edge Runtime）
const noopLogger = {
  warn: (..._args: unknown[]) => {},
  error: (..._args: unknown[]) => {},
  info: (..._args: unknown[]) => {},
  debug: (..._args: unknown[]) => {}
};

type Logger = typeof noopLogger;

// 动态导入 logger（避免在 Edge Runtime 中出错）
let cachedLogger: Logger | null = null;

const getLogger = (): Logger => {
  if (cachedLogger) return cachedLogger;
  
  // 检查是否在 Edge Runtime 中
  const isEdgeRuntime = typeof process === 'undefined' || 
    !process.versions?.node;
  
  if (isEdgeRuntime) {
    cachedLogger = noopLogger;
    return cachedLogger;
  }
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const logger = require('./logger');
    cachedLogger = logger.log || logger;
    return cachedLogger || noopLogger;
  } catch {
    cachedLogger = noopLogger;
    return cachedLogger;
  }
};

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.MIHOMO_SECRET || 'mihomox-default-secret-change-in-production'
);

const TOKEN_EXPIRY = '7d';

/**
 * 输入验证 Schema
 */
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').max(50, 'Username too long'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * 生成 JWT token
 */
export async function createToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

/**
 * 验证 JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

/**
 * 从请求中获取当前用户
 */
export async function getCurrentUser(): Promise<{ username: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  if (!token) return null;
  
  const payload = await verifyToken(token);
  if (!payload || !payload.username) return null;
  
  return { username: payload.username as string };
}

/**
 * 验证用户凭据（带输入验证）
 */
export function validateCredentials(
  username: string, 
  password: string
): { valid: boolean; user?: string; error?: string } {
  // 输入验证
  const validation = loginSchema.safeParse({ username, password });
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    return { valid: false, error: firstError?.message || 'Validation error' };
  }
  
  const envUsername = process.env.MihomoX_USERNAME || 'MihomoX';
  const envPassword = process.env.MihomoX_PASSWORD || '';
  
  // 生产环境检查：必须设置密码
  if (process.env.NODE_ENV === 'production' && !envPassword) {
    getLogger().warn('[Auth] SECURITY WARNING: No password set in production environment!');
    return { valid: false, error: 'Server configuration error' };
  }
  
  // 如果环境变量设置了密码，必须使用环境变量的密码
  if (envPassword && username === envUsername && password === envPassword) {
    return { valid: true, user: username };
  }
  
  // 如果环境变量没有设置密码
  if (!envPassword) {
    // 检查是否设置了密码哈希
    const defaultPasswordHash = process.env.MIHOMO_PASSWORD_HASH;
    if (defaultPasswordHash) {
      // 这里可以添加实际的哈希验证逻辑
      // 使用 zod 验证哈希格式
      const hashSchema = z.string().regex(/^[a-zA-Z0-9+/]+={0,2}$/);
      if (hashSchema.safeParse(defaultPasswordHash).success) {
        // 实际验证时需要使用 crypto 相关函数
        // 这里简化处理
        return { valid: false, error: 'Invalid credentials' };
      }
    }
    
    // 没有设置密码时，允许登录但记录警告
    if (username === envUsername && password) {
      getLogger().warn('[Auth] WARNING: Logging in with default configuration. Please set MIHOMO_PASSWORD in production!');
      return { valid: true, user: username };
    }
  }
  
  return { valid: false, error: 'Invalid username or password' };
}

/**
 * 验证并解析登录请求体
 */
export function parseLoginRequest(body: unknown): { success: true; data: LoginInput } | { success: false; error: string } {
  const result = loginSchema.safeParse(body);
  
  if (!result.success) {
    const firstError = result.error.issues[0];
    return { success: false, error: firstError?.message || 'Validation error' };
  }
  
  return { success: true, data: result.data };
}
