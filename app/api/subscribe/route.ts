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

    // Case 2: Apply a subscription (download and save to config.yaml)
    if (action === 'apply' || (url && !name)) {
      const targetUrl = url;
      if (!targetUrl) {
        return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 });
      }

      console.log(`[Subscribe] Fetching subscription: ${targetUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      try {
        const res = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'clash-verge/v1.3.8',
            'Accept': '*/*',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`Failed to fetch subscription: ${res.status} ${res.statusText}`);
        }
        const rawConfig = await res.text();
        
        // Step 1: Parse config content
        let parsed: any;
        try {
          parsed = yaml.load(rawConfig);
        } catch (e) {
          console.log('[Subscribe] YAML parse failed, trying Base64...');
          try {
            const decoded = Buffer.from(rawConfig, 'base64').toString();
            parsed = yaml.load(decoded);
          } catch (e2) {
            throw new Error('Content is neither valid YAML nor Base64 encoded');
          }
        }

        if (typeof parsed !== 'object' || parsed === null) {
          throw new Error('Invalid config format: result is not an object');
        }

        // Step 2: Inject custom settings
        parsed['external-controller'] = '127.0.0.1:9099';
        parsed['secret'] = process.env.MIHOMO_SECRET || '';
        
        parsed['tun'] = {
          enable: true,
          stack: 'system',
          'auto-route': true,
          'auto-detect-interface': true,
          'dns-hijack': ['any:53']
        };
        
        if (!parsed['dns']) {
          parsed['dns'] = {};
        }
        parsed['dns']['enable'] = true;
        parsed['dns']['ipv6'] = false;
        parsed['dns']['enhanced-mode'] = 'fake-ip';
        parsed['dns']['nameserver'] = ['223.5.5.5', '119.29.29.29'];

        // Step 3: Save to config.yaml
        const configPath = path.join(process.cwd(), 'config/config.yaml');
        const configDir = path.dirname(configPath);
        
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true });
        }

        fs.writeFileSync(configPath, yaml.dump(parsed));
        
        console.log('[Subscribe] Subscription applied and saved locally');
        return NextResponse.json({ success: true, message: 'Subscription applied successfully' });
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.error('[Subscribe] Fetch error:', err);
        if (err.name === 'AbortError') {
          throw new Error('Fetch timeout: server took too long to respond');
        }
        if (err.cause?.code === 'ECONNRESET' || err.code === 'ECONNRESET') {
          throw new Error('Connection reset by provider. This often happens if the URL is blocked. Please check your network or try using a proxy.');
        }
        throw err;
      }
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
