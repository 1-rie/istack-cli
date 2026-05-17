import { createDecipheriv } from 'crypto';
import { ENCRYPTED_SKILLS } from './encrypted.js';

export type WizardOption = {
  label: string;
  value: string;
};

export type WizardQuestion = {
  id: string;
  label: string;
  hint: string;
  placeholder?: string;
  type?: 'text' | 'select' | 'multiselect';
  options?: WizardOption[];
};

export type SkillResult = {
  systemPrompt: string;
  questions: WizardQuestion[];
};

function parseFrontMatter(content: string): SkillResult {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { systemPrompt: content, questions: [] };

  const yaml         = match[1];
  const systemPrompt = match[2].trim();

  // Parse the questions array from the YAML block
  const questions: WizardQuestion[] = [];
  const blocks = yaml.split(/\n  - /).slice(1); // skip the "questions:" line
  for (const block of blocks) {
    const id          = block.match(/id:\s*(.+)/)?.[1]?.trim();
    const label       = block.match(/label:\s*(.+)/)?.[1]?.trim();
    const hint        = block.match(/hint:\s*(.+)/)?.[1]?.trim();
    const placeholder = block.match(/placeholder:\s*(.+)/)?.[1]?.trim();
    const type        = (block.match(/type:\s*(.+)/)?.[1]?.trim() ?? 'text') as WizardQuestion['type'];
    const optRaw      = block.match(/options:\s*(.+)/)?.[1]?.trim();
    const options     = optRaw
      ? optRaw.split(',').map(s => ({ label: s.trim(), value: s.trim().toLowerCase().replace(/\s+/g, '_') }))
      : undefined;
    if (id && label && hint) questions.push({ id, label, hint, placeholder, type, options });
  }

  return { systemPrompt, questions };
}

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

export async function resolveSkill(name: string): Promise<SkillResult | undefined> {
  // Dev mode: __ISTACK_BK__ not set → read plaintext from skills-source/
  if (IS_DEV) {
    return resolveDevSkill(name);
  }

  const blob = ENCRYPTED_SKILLS[name];
  if (!blob) return undefined;

  // Cache hit (per process session only — never written to disk)
  if (_decryptedCache.has(name)) {
    const cached = _decryptedCache.get(name)!;
    return parseFrontMatter(cached);
  }

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

  return parseFrontMatter(decrypted);
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

async function resolveDevSkill(name: string): Promise<SkillResult | undefined> {
  try {
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    const path = join(import.meta.dir, '../../skills-source', `${name}.md`);
    const content = readFileSync(path, 'utf8');
    return parseFrontMatter(content);
  } catch {
    return undefined;
  }
}
