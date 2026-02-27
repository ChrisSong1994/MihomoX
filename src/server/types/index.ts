/**
 * MihomoX 类型定义
 */

// ========== 订阅相关类型 ==========

export interface Subscription {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  lastUpdate?: string;
  nodeCount?: number;
  trafficUsed?: number;
  trafficTotal?: number;
  expireDate?: string;
  status: "active" | "expired" | "error" | "idle";
}

// ========== 应用设置相关类型 ==========

export interface AppSettings {
  logPath: string;
  locale: string;
  mixed_port?: number;
  controller_port?: number;
  secret?: string;
}

// ========== Mihomo 配置类型 ==========

export interface Proxy {
  name: string;
  type: 'ss' | 'vmess' | 'trojan' | 'http' | 'socks5' | 'snell' | 'wireguard';
  server: string;
  port: number;
  [key: string]: unknown;
}

export interface ProxyGroup {
  name: string;
  type: 'select' | 'url-test' | 'fallback' | 'load-balance' | 'relay' | 'direct';
  proxies: string[];
  url?: string;
  interval?: number;
  tolerance?: number;
  lazy?: boolean;
  [key: string]: unknown;
}

export interface Rule {
  type: 'DOMAIN' | 'DOMAIN-SUFFIX' | 'DOMAIN-KEYWORD' | 'GEOIP' | 'IP-CIDR' | 'IP-CIDR6' | 'PROCESS-NAME' | 'RULE-SET';
  value: string;
  proxy: string;
  [key: string]: unknown;
}

export interface DNSConfig {
  enable: boolean;
  ipv6: boolean;
  'enhanced-mode': 'fake-ip' | 'real-ip' | 'redir-host';
  nameserver: string[];
  'fallback-nameserver'?: string[];
  'fake-ip-range'?: string;
  'fake-ip-filter'?: string[];
  [key: string]: unknown;
}

export interface MihomoConfig {
  // 基础配置
  'mixed-port'?: number;
  'socks-port'?: number;
  'port'?: number;
  'tproxy-port'?: number;
  'external-controller'?: string;
  secret?: string;
  'bind-address'?: string;
  'allow-lan'?: boolean;
  mode?: 'rule' | 'global' | 'direct' | 'script';
  'log-level'?: 'debug' | 'info' | 'warning' | 'error' | 'silent';
  
  // 代理配置
  proxies?: Proxy[];
  'proxy-groups'?: ProxyGroup[];
  rules?: Rule[];
  
  // DNS 配置
  dns?: DNSConfig;
  
  // Geo 数据
  'geodata-mode'?: boolean;
  'geox-url'?: {
    geoip?: string;
    geosite?: string;
    mmdb?: string;
    [key: string]: string | undefined;
  };
  
  // 其他配置
  hosts?: Record<string, string>;
  'profile'?: {
    'store-selected'?: boolean;
    'store-fake-ip'?: boolean;
  };
  'experimental'?: Record<string, unknown>;
  [key: string]: unknown;
}

// ========== 内核状态相关类型 ==========

export interface KernelStatus {
  running: boolean;
  config: MihomoConfig | null;
  pid?: number;
  memoryUsage?: number;
}

// ========== 流量统计相关类型 ==========

export interface TrafficData {
  time: number;
  up: number;
  down: number;
}

export interface SystemStats {
  cpu: string;
  memory: {
    percent: string;
    used: string;
    total: string;
    kernel: string;
  };
  network: {
    up: number;
    down: number;
  };
  uptime: number;
  platform: string;
}

// ========== API 响应类型 ==========

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ========== Result 类型（用于错误处理）==========

export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// ========== Zod 验证 Schemas ==========

import { z } from 'zod';

// 订阅验证 Schema
export const subscriptionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  url: z.string().url('Invalid URL').max(500, 'URL too long'),
  enabled: z.boolean().optional().default(true),
});

export const subscriptionUpdateSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().max(500).optional(),
  enabled: z.boolean().optional(),
});

// 应用设置验证 Schema
export const appSettingsSchema = z.object({
  logPath: z.string().optional(),
  locale: z.enum(['zh', 'en']).optional(),
  mixed_port: z.number().min(1).max(65535).optional(),
  controller_port: z.number().min(1).max(65535).optional(),
  secret: z.string().optional(),
});

// 端口更新 Schema
export const portUpdateSchema = z.object({
  mixed_port: z.number().min(1).max(65535).optional(),
  controller_port: z.number().min(1).max(65535).optional(),
});

// 内核操作 Schema
export const kernelActionSchema = z.object({
  action: z.enum(['start', 'stop']),
});

// 订阅操作 Schema
export const subscriptionActionSchema = z.object({
  action: z.enum(['apply']).optional(),
  url: z.string().url().optional(),
});

// 类型推断
export type SubscriptionInput = z.infer<typeof subscriptionSchema>;
export type SubscriptionUpdateInput = z.infer<typeof subscriptionUpdateSchema>;
export type AppSettingsInput = z.infer<typeof appSettingsSchema>;
export type PortUpdateInput = z.infer<typeof portUpdateSchema>;
export type KernelActionInput = z.infer<typeof kernelActionSchema>;
