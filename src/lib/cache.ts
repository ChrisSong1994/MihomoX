/**
 * 配置缓存模块
 * 用于减少频繁的文件 I/O 操作
 */

// 缓存配置
interface CacheItem<T> {
  data: T;
  timestamp: number;
}

class ConfigCache {
  private cache: Map<string, CacheItem<unknown>> = new Map();
  private defaultTTL: number = 5000; // 5秒

  /**
   * 获取缓存
   */
  get<T>(key: string, ttl: number = this.defaultTTL): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * 删除缓存
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 设置 TTL
   */
  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
  }
}

// 导出单例
export const configCache = new ConfigCache();

// 便捷函数
export const getCachedSettings = <T>(key: string, ttl?: number): T | null => {
  return configCache.get<T>(key, ttl);
};

export const setCachedSettings = <T>(key: string, data: T): void => {
  configCache.set(key, data);
};

export const invalidateCache = (key?: string): void => {
  if (key) {
    configCache.delete(key);
  } else {
    configCache.clear();
  }
};
