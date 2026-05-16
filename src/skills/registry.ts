import { createDecipheriv } from 'crypto';
import { ENCRYPTED_SKILLS } from './encrypted.js';

// First 16 bytes of AES key embedded in binary (set at build time via ISTACK_BINARY_KEY_HALF env)
// The remaining 16 bytes come from the user's license key stored in ~/.istack/config.json
const BINARY_KEY_HALF = process.env.__ISTACK_BK__
  ? Buffer.from(process.env.__ISTACK_BK__, 'hex')
  : Buffer.alloc(16); // zero = dev mode / unencrypted pass-through

const IS_DEV = !process.env.__ISTACK_BK__;

let _decryptedCache: Map<string, string> = new Map();

export function listSkills(): string[] {
  if (IS_DEV) return listDevSkills();
  return Object.keys(ENCRYPTED_SKILLS);
}

export async function resolveSkill(name: string): Promise<string | undefined> {
  // Dev mode: __ISTACK_BK__ not set → read plaintext from skills-source/
  if (IS_DEV) {
    return resolveDevSkill(name);
  }

  const blob = ENCRYPTED_SKILLS[name];
  if (!blob) return undefined;

  // Cache hit (per process session only — never written to disk)
  if (_decryptedCache.has(name)) return _decryptedCache.get(name);

  const { loadConfig } = await import('../auth/config.js');
  const config = await loadConfig();

  if (!config.licenseKeyHalf) {
    throw new Error('License key not configured. Run: istack login');
  }

  // Reconstruct full 32-byte AES key from split halves
  const licenseHalf = Buffer.from(config.licenseKeyHalf, 'hex');
  const fullKey = Buffer.concat([BINARY_KEY_HALF, licenseHalf]).slice(0, 32);

  const raw = Buffer.from(blob, 'base64');
  const iv = raw.subarray(0, 16);
  const encrypted = raw.subarray(16);

  const decipher = createDecipheriv('aes-256-cbc', fullKey, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');

  // Store in process memory only — never touches disk
  _decryptedCache.set(name, decrypted);

  return decrypted;
}

function listDevSkills(): string[] {
  try {
    const { readdirSync } = require('fs');
    const { join } = require('path');
    const dir = join(import.meta.dir, '../../skills-source');
    return readdirSync(dir)
      .filter((f: string) => f.endsWith('.md'))
      .map((f: string) => f.replace('.md', ''));
  } catch {
    return [];
  }
}

async function resolveDevSkill(name: string): Promise<string | undefined> {
  try {
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    const path = join(import.meta.dir, '../../skills-source', `${name}.md`);
    return readFileSync(path, 'utf8');
  } catch {
    return undefined;
  }
}
