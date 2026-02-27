/**
 * MihomoX 类型定义
 */

// ==================== 认证相关 ====================

export interface AuthPayload {
  username: string;
  iat: number;
  exp: number;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  message?: string;
}

// ==================== 配置相关 ====================

export interface MihomoProxy {
  name: string;
  type: 'http' | 'https' | 'socks5' | 'socks4' | 'ss' | 'vmess' | 'trojan' | 'shadowsocks';
  server: string;
  port: number;
  username?: string;
  password?: string;
  skipCertVerify?: boolean;
  tls?: boolean;
  sni?: string;
  [key: string]: any;
}

export interface MihomoProxyGroup {
  name: string;
  type: 'select' | 'url-test' | 'fallback' | 'load-balance' | 'direct' | 'reject';
  proxies: string[];
  url?: string;
  interval?: number;
  tolerance?: number;
  lazy?: boolean;
  [key: string]: any;
}

export interface MihomoRule {
  type: 'DOMAIN' | 'DOMAIN-SUFFIX' | 'DOMAIN-KEYWORD' | 'GEOIP' | 'IP-CIDR' | 'IP-CIDR6' | 'PROCESS-NAME' | 'RULE-SET' | 'DEFAULT';
  value: string;
  proxy?: string;
}

export interface MihomoConfig {
  proxies: MihomoProxy[];
  'proxy-groups': MihomoProxyGroup[];
  rules: MihomoRule[];
  'mixed-port'?: number;
  'socks-port'?: number;
  'port'?: number;
  'allow-lan'?: boolean;
  'bind-address'?: string;
  'mode'?: 'rule' | 'global' | 'direct' | 'script';
  'log-level'?: 'info' | 'warning' | 'error' | 'debug' | 'silent';
  'external-controller'?: string;
  secret?: string;
  dns?: {
    enable?: boolean;
    ipv6?: boolean;
    'enhanced-mode'?: 'fake-ip' | 'redir-host';
    nameserver?: string[];
    fallback?: string[];
    [key: string]: any;
  };
  'geodata-mode'?: boolean;
  'geox-url'?: {
    geoip?: string;
    geosite?: string;
    mmdb?: string;
  };
  [key: string]: any;
}

// ==================== 应用配置 ====================

export interface AppSettings {
  logPath: string;
  locale: string;
  mixed_port?: number;
  controller_port?: number;
  secret?: string;
}

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
  status: 'active' | 'expired' | 'error' | 'idle';
}

// ==================== 系统状态 ====================

export interface KernelStatus {
  running: boolean;
  pid?: number;
  uptime?: number;
  version?: string;
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

export interface TrafficPoint {
  time: number;
  up: number;
  down: number;
}

// ==================== API 响应 ====================

export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ==================== 端口配置 ====================

export interface PortConfig {
  mixed_port: number;
  controller_port: number;
  source: 'Env' | 'Settings' | 'Initial';
}
