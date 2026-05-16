import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

export type Provider = 'anthropic' | 'openai' | 'gemini';

export type Config = {
  provider?: Provider;
  model?: string;
  anthropicKey?: string;
  openaiKey?: string;
  geminiKey?: string;
  licenseKey?: string;
  licenseKeyHalf?: string;   // 16-byte hex — the server-side half of the AES key
  licenseEmail?: string;
  licenseValidUntil?: string; // ISO date
};

const CONFIG_DIR  = join(homedir(), '.istack');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export function loadConfig(): Config {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf8')) as Config;
  } catch {
    return {};
  }
}

export function saveConfig(config: Config): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { encoding: 'utf8', mode: 0o600 });
}

export function mergeConfig(patch: Partial<Config>): Config {
  const current = loadConfig();
  const updated = { ...current, ...patch };
  saveConfig(updated);
  return updated;
}
