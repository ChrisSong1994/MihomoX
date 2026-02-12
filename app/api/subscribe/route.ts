import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { getSubscriptions, addSubscription, deleteSubscription, updateSubscription } from '@/lib/store';

/**
 * Subscription API Route
 * Handles CRUD operations for subscription list and fetching/applying subscription content
 */

// GET: List all subscriptions
export async function GET() {
  try {
    const subscriptions = getSubscriptions();
    return NextResponse.json({ success: true, subscriptions });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST: Add a new subscription or apply a subscription content
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, name, action } = body;

    // Case 1: Add to subscription list
    if (name && url && !action) {
      const newSub = addSubscription({ name, url, enabled: true });
      return NextResponse.json({ success: true, data: newSub });
    }

    // Case 2: Apply subscriptions (single or all enabled)
    if (action === 'apply' || (url && !name)) {
      const targetUrl = url;
      const subs = getSubscriptions();
      
      let urlsToFetch: string[] = [];
      if (targetUrl) {
        urlsToFetch = [targetUrl];
      } else {
        // If no URL provided, apply all enabled ones
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
            // Merge proxies
            if (Array.isArray(parsed.proxies)) {
              parsed.proxies.forEach((p: any) => {
                if (!mergedConfig.proxies.find((existing: any) => existing.name === p.name)) {
                  mergedConfig.proxies.push(p);
                }
              });
            }

            // Merge proxy-groups
            if (Array.isArray(parsed['proxy-groups'])) {
              parsed['proxy-groups'].forEach((g: any) => {
                const existingGroup = mergedConfig['proxy-groups'].find((eg: any) => eg.name === g.name);
                if (existingGroup) {
                  // Merge members
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

            // Merge rules
            if (Array.isArray(parsed.rules)) {
              mergedConfig.rules = [...mergedConfig.rules, ...parsed.rules];
            }
          }
        } catch (err) {
          console.error(`[Subscribe] Failed to fetch ${fetchUrl}:`, err);
          // Continue with other subscriptions
        } finally {
          clearTimeout(timeoutId);
        }
      };

      // Fetch all in parallel
      await Promise.all(urlsToFetch.map(fetchAndMerge));

      if (mergedConfig.proxies.length === 0) {
        return NextResponse.json({ success: false, error: 'No valid proxies found in subscriptions' }, { status: 400 });
      }

      // Step 2: Inject custom settings
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

      // Step 3: Save to config.yaml
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

// PATCH: Update subscription status (toggle enable/disable)
export async function PATCH(req: Request) {
  try {
    const { id, ...updates } = await req.json();
    const subs = getSubscriptions();
    const sub = subs.find(s => s.id === id);
    if (!sub) {
      return NextResponse.json({ success: false, error: 'Subscription not found' }, { status: 404 });
    }
    
    // If toggling enabled, we just update the store
    updateSubscription(id, { ...updates, enabled: updates.enabled !== undefined ? updates.enabled : !sub.enabled });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 });
  }
}

// DELETE: Remove subscription from list
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
