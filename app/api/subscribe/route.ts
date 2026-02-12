import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { getSubscriptions, addSubscription, deleteSubscription, updateSubscription } from '@/lib/store';

/**
 * 订阅管理 API 路由
 * 负责订阅列表的增删改查，以及订阅内容的获取与应用
 */

// GET：获取全部订阅列表
export async function GET() {
  try {
    const subscriptions = getSubscriptions();
    return NextResponse.json({ success: true, subscriptions });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST：添加新订阅或应用订阅内容
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, name, action } = body;

    // 情况 1：添加到订阅列表
    if (name && url && !action) {
      const newSub = addSubscription({ name, url, enabled: true });
      return NextResponse.json({ success: true, data: newSub });
    }

    // 情况 2：应用订阅（单个或全部启用的订阅）
    if (action === 'apply' || (url && !name)) {
      const targetUrl = url;
      const subs = getSubscriptions();
      
      let urlsToFetch: string[] = [];
      if (targetUrl) {
        urlsToFetch = [targetUrl];
      } else {
        // 如果未提供 URL，则应用所有已启用的订阅
        urlsToFetch = subs.filter(s => s.enabled).map(s => s.url);
      }

      if (urlsToFetch.length === 0) {
        return NextResponse.json({ success: false, error: 'No enabled subscriptions to apply' }, { status: 400 });
      }

      console.log(`[Subscribe] Applying ${urlsToFetch.length} subscriptions`);
      
      const mergedConfig: any = {
        proxies: [],
        'proxy-groups': [],
        rules: []
      };

      const fetchAndMerge = async (fetchUrl: string) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
          const res = await fetch(fetchUrl, {
            headers: {
              'User-Agent': 'clash-verge/v1.3.8',
              'Accept': '*/*',
            },
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
          const rawConfig = await res.text();
          
          let parsed: any;
          try {
            parsed = yaml.load(rawConfig);
          } catch (e) {
            const decoded = Buffer.from(rawConfig, 'base64').toString();
            parsed = yaml.load(decoded);
          }

          if (parsed && typeof parsed === 'object') {
            // 合并 proxies
            if (Array.isArray(parsed.proxies)) {
              parsed.proxies.forEach((p: any) => {
                if (!mergedConfig.proxies.find((existing: any) => existing.name === p.name)) {
                  mergedConfig.proxies.push(p);
                }
              });
            }

            // 合并 proxy-groups
            if (Array.isArray(parsed['proxy-groups'])) {
              parsed['proxy-groups'].forEach((g: any) => {
                const existingGroup = mergedConfig['proxy-groups'].find((eg: any) => eg.name === g.name);
                if (existingGroup) {
                  // 合并分组成员
                  if (Array.isArray(g.proxies)) {
                    g.proxies.forEach((pm: any) => {
                      if (!existingGroup.proxies.includes(pm)) {
                        existingGroup.proxies.push(pm);
                      }
                    });
                  }
                } else {
                  mergedConfig['proxy-groups'].push(g);
                }
              });
            }

            // 合并规则
            if (Array.isArray(parsed.rules)) {
              mergedConfig.rules = [...mergedConfig.rules, ...parsed.rules];
            }
          }
        } catch (err) {
          console.error(`[Subscribe] Failed to fetch ${fetchUrl}:`, err);
          // 出错时继续处理其他订阅
        } finally {
          clearTimeout(timeoutId);
        }
      };

      // 并行获取与合并各订阅
      await Promise.all(urlsToFetch.map(fetchAndMerge));

      if (mergedConfig.proxies.length === 0) {
        return NextResponse.json({ success: false, error: 'No valid proxies found in subscriptions' }, { status: 400 });
      }

      // 步骤 2：注入自定义配置项
      const finalConfig = { ...mergedConfig };
      finalConfig['external-controller'] = '127.0.0.1:9099';
      finalConfig['secret'] = process.env.MIHOMO_SECRET || '';
      
      finalConfig['tun'] = {
        enable: true,
        stack: 'system',
        'auto-route': true,
        'auto-detect-interface': true,
        'dns-hijack': ['any:53']
      };
      
      if (!finalConfig['dns']) {
        finalConfig['dns'] = {};
      }
      finalConfig['dns']['enable'] = true;
      finalConfig['dns']['ipv6'] = false;
      finalConfig['dns']['enhanced-mode'] = 'fake-ip';
      finalConfig['dns']['nameserver'] = ['223.5.5.5', '119.29.29.29'];

      // 步骤 3：写入到 config.yaml
      const configPath = path.join(process.cwd(), 'config/config.yaml');
      const configDir = path.dirname(configPath);
      
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      fs.writeFileSync(configPath, yaml.dump(finalConfig));
      
      console.log(`[Subscribe] ${urlsToFetch.length} subscriptions merged and saved`);
      return NextResponse.json({ 
        success: true, 
        message: `Successfully merged ${urlsToFetch.length} subscriptions` 
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  } catch (error: any) {
    console.error('[Subscribe] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH：更新订阅状态（启用/禁用切换）
export async function PATCH(req: Request) {
  try {
    const { id, ...updates } = await req.json();
    const subs = getSubscriptions();
    const sub = subs.find(s => s.id === id);
    if (!sub) {
      return NextResponse.json({ success: false, error: 'Subscription not found' }, { status: 404 });
    }
    
    // 切换启用状态时，直接更新存储即可
    updateSubscription(id, { ...updates, enabled: updates.enabled !== undefined ? updates.enabled : !sub.enabled });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 });
  }
}

// DELETE：从列表中移除订阅
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }
    deleteSubscription(id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 });
  }
}
