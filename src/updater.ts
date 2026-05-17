import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const GITHUB_API = 'https://api.github.com/repos/1-rie/istack-cli/releases/latest';
const UPDATE_CACHE = join(homedir(), '.istack', 'update-cache.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

type UpdateCache = { checkedAt: string; latestVersion: string };

export type UpdateResult = {
  hasUpdate: boolean;
  latestVersion: string;
  currentVersion: string;
};

export function getCurrentVersion(): string {
  return (process.env.ISTACK_VERSION ?? '1.0.0').replace(/^v/, '');
}

export async function checkForUpdate(): Promise<UpdateResult> {
  const current = getCurrentVersion();

  const cached = readCache();
  if (cached) {
    return {
      hasUpdate: compareVersions(cached.latestVersion, current) > 0,
      latestVersion: cached.latestVersion,
      currentVersion: current,
    };
  }

  try {
    const res = await fetch(GITHUB_API, {
      headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'istack-cli' },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return { hasUpdate: false, latestVersion: current, currentVersion: current };

    const data = await res.json() as { tag_name: string };
    const latest = data.tag_name.replace(/^v/, '');
    writeCache({ checkedAt: new Date().toISOString(), latestVersion: latest });

    return {
      hasUpdate: compareVersions(latest, current) > 0,
      latestVersion: latest,
      currentVersion: current,
    };
  } catch {
    return { hasUpdate: false, latestVersion: current, currentVersion: current };
  }
}

function readCache(): UpdateCache | null {
  try {
    if (!existsSync(UPDATE_CACHE)) return null;
    const data = JSON.parse(readFileSync(UPDATE_CACHE, 'utf8')) as UpdateCache;
    if (Date.now() - new Date(data.checkedAt).getTime() > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(data: UpdateCache): void {
  try {
    writeFileSync(UPDATE_CACHE, JSON.stringify(data), { encoding: 'utf8', mode: 0o600 });
  } catch {
    // non-fatal
  }
}

function compareVersions(a: string, b: string): number {
  const parse = (v: string) => v.split('.').map(n => parseInt(n, 10) || 0);
  const [aMaj, aMin, aPat] = parse(a);
  const [bMaj, bMin, bPat] = parse(b);
  if (aMaj !== bMaj) return aMaj - bMaj;
  if (aMin !== bMin) return aMin - bMin;
  return aPat - bPat;
}
