/**
 * 统一的错误响应工具
 */

import { z } from 'zod';
import type { ApiResponse } from '../server/types';
import { log } from './logger';

/**
 * API 错误类
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 创建成功响应
 */
export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * 创建错误响应
 */
export function errorResponse(message: string, error?: unknown): ApiResponse {
  const errorMessage = error instanceof Error ? error.message : message;
  return {
    success: false,
    error: errorMessage,
  };
}

/**
 * 处理 API 路由错误
 */
export function handleApiError(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(
      { success: false, error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  if (error instanceof z.ZodError) {
    const issues = error.issues.map(i => ({
      field: i.path.join('.'),
      message: i.message
    }));
    return Response.json(
      { success: false, error: 'Validation failed', details: issues },
      { status: 400 }
    );
  }

  log.error('[API Error]:', error);
  return Response.json(
    { success: false, error: 'Internal Server Error' },
    { status: 500 }
  );
}

/**
 * 验证请求体
 */
export function validateBody<T extends z.ZodSchema>(
  schema: T,
  body: unknown
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  return { success: true, data: result.data };
}

/**
 * 验证查询参数
 */
export function validateQuery<T extends z.ZodSchema>(
  schema: T,
  query: Record<string, string | string[] | undefined>
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  // 转换查询参数为普通对象
  const plainQuery: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string') {
      plainQuery[key] = value;
    } else if (Array.isArray(value)) {
      plainQuery[key] = value[0];
    }
  }
  
  const result = schema.safeParse(plainQuery);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  return { success: true, data: result.data };
}
