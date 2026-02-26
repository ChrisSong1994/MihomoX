import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { getSubscriptions, addSubscription, deleteSubscription, updateSubscription } from '@/lib/store';
import { addLog, generateFullConfig } from '@/lib/mihomo';
import { getPaths } from '@/lib/paths';

const paths = getPaths();

/**
 * 订阅管理 API 路由
 * 负责订阅列表的增删改查，以及订阅内容的获取与应用
 */

// GET：获取全部订阅列表
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    // 如果提供了 id，则返回该订阅的本地配置文件内容
    if (id) {
      const filePath = path.join(paths.subscriptionsDir, `${id}.yaml`);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        return NextResponse.json({ success: true, content });
      }
      return NextResponse.json({ success: false, error: 'Subscription config file not found' }, { status: 404 });
    }

    const subscriptions = getSubscriptions().map(sub => ({
      ...sub,
      hasLocalConfig: fs.existsSync(path.join(paths.subscriptionsDir, `${sub.id}.yaml`))
    }));
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
      addLog(`[SUBSCRIPTION] Added new subscription: ${name}`);
      generateFullConfig();
      return NextResponse.json({ success: true, data: newSub });
    }

    // 情况 2：应用订阅（单个或全部启用的订阅）
    if (action === 'apply' || (url && !name)) {
      const targetUrl = url;
      const subs = getSubscriptions();
      
      let urlsToFetch: string[] = [];
      if (targetUrl) {
        urlsToFetch = [targetUrl];
        const sub = subs.find(s => s.url === targetUrl);
        addLog(`[SUBSCRIPTION] Updating subscription: ${sub?.name || targetUrl}`);
      } else {
        // 如果未提供 URL，则应用所有已启用的订阅
        urlsToFetch = subs.filter(s => s.enabled).map(s => s.url);
        addLog(`[SUBSCRIPTION] Applying ${urlsToFetch.length} enabled subscriptions`);
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
          
          // 解析流量信息 (Subscription Userinfo)
          const userInfo = res.headers.get('subscription-userinfo');
          if (userInfo) {
            const info: any = {};
            userInfo.split(';').forEach(item => {
              const [key, val] = item.trim().split('=');
              if (key && val) info[key] = parseInt(val);
            });
            
            // 更新订阅对象的流量信息
            const subs = getSubscriptions();
            const sub = subs.find(s => s.url === fetchUrl);
            if (sub) {
              updateSubscription(sub.id, {
                trafficUsed: (info.upload || 0) + (info.download || 0),
                trafficTotal: info.total || 0,
                expireDate: info.expire ? new Date(info.expire * 1000).toISOString() : undefined,
                lastUpdate: new Date().toISOString()
              });
            }
          } else {
            // 如果没有流量信息，仅更新更新时间
            const subs = getSubscriptions();
            const sub = subs.find(s => s.url === fetchUrl);
            if (sub) {
              updateSubscription(sub.id, {
                lastUpdate: new Date().toISOString()
              });
            }
          }

          const rawConfig = await res.text();
          
          // 保存原始配置到本地文件
          const sub = getSubscriptions().find(s => s.url === fetchUrl);
          if (sub) {
            const filePath = path.join(paths.subscriptionsDir, `${sub.id}.yaml`);
            fs.writeFileSync(filePath, rawConfig, 'utf8');
          }
          
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

      // 步骤 2：生成并保存完整配置
      generateFullConfig();
      
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

// PATCH：更新订阅信息
export async function PATCH(req: Request) {
  try {
    const { id, ...updates } = await req.json();
    const subs = getSubscriptions();
    const sub = subs.find(s => s.id === id);
    if (!sub) {
      return NextResponse.json({ success: false, error: 'Subscription not found' }, { status: 404 });
    }
    
    // 更新订阅信息
    updateSubscription(id, { ...updates });
    addLog(`[SUBSCRIPTION] Updated subscription: ${sub.name}`);

    // 重新生成完整配置
    generateFullConfig();

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
    const subs = getSubscriptions();
    const sub = subs.find(s => s.id === id);
    deleteSubscription(id);
    // 同时删除本地配置文件
    const filePath = path.join(paths.subscriptionsDir, `${id}.yaml`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    if (sub) {
      addLog(`[SUBSCRIPTION] Deleted subscription: ${sub.name}`);
    }
    
    // 重新生成完整配置
    generateFullConfig();
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 });
  }
}
