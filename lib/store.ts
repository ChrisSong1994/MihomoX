import fs from 'fs';
import path from 'path';

const SUBS_FILE = path.join(process.cwd(), 'config', 'subscriptions.json');

export interface Subscription {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  lastUpdate?: string;
  nodeCount?: number;
  status: 'active' | 'expired' | 'error' | 'idle';
}

// Ensure directory exists
const ensureDir = () => {
  const dir = path.dirname(SUBS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const SETTINGS_FILE = path.join(process.cwd(), 'config', 'settings.json');

export interface AppSettings {
  logPath: string;
  locale: string;
}

const defaultSettings: AppSettings = {
  logPath: path.join(process.cwd(), 'logs'),
  locale: 'zh'
};

export const getSettings = (): AppSettings => {
  ensureDir();
  if (!fs.existsSync(SETTINGS_FILE)) {
    return defaultSettings;
  }
  try {
    const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    return { ...defaultSettings, ...JSON.parse(data) };
  } catch (e) {
    return defaultSettings;
  }
};

export const saveSettings = (settings: Partial<AppSettings>) => {
  ensureDir();
  const current = getSettings();
  const updated = { ...current, ...settings };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2));
  return updated;
};

export const getSubscriptions = (): Subscription[] => {
  ensureDir();
  if (!fs.existsSync(SUBS_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(SUBS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Read subscriptions error:', e);
    return [];
  }
};

export const saveSubscriptions = (subs: Subscription[]) => {
  ensureDir();
  fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2));
};

export const addSubscription = (sub: Omit<Subscription, 'id' | 'status'>) => {
  const subs = getSubscriptions();
  const newSub: Subscription = {
    ...sub,
    id: Math.random().toString(36).substring(2, 9),
    status: 'idle',
  };
  subs.push(newSub);
  saveSubscriptions(subs);
  return newSub;
};

export const deleteSubscription = (id: string) => {
  const subs = getSubscriptions().filter(s => s.id !== id);
  saveSubscriptions(subs);
};

export const updateSubscription = (id: string, updates: Partial<Subscription>) => {
  const subs = getSubscriptions().map(s => s.id === id ? { ...s, ...updates } : s);
  saveSubscriptions(subs);
};
