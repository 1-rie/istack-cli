import { mergeConfig, loadConfig } from './config.js';

const LICENSE_API = 'https://project-9sli3.vercel.app/api/v1/license/validate';

export type LicenseResult = {
  valid: boolean;
  email?: string;
  plan?: string;
  validUntil?: string;
  keyHalf?: string; // 16-byte hex — split AES key from server
  error?: string;
};

export async function validateLicense(licenseKey: string): Promise<LicenseResult> {
  try {
    const url = `${LICENSE_API}?key=${encodeURIComponent(licenseKey)}`;
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Server error' }));
      return { valid: false, error: (err as any).error ?? `HTTP ${response.status}` };
    }

    const data = await response.json() as {
      valid: boolean;
      email: string;
      plan: string;
      valid_until: string;
      key_half: string;
    };

    if (data.valid) {
      // Persist licence info + key half in config
      mergeConfig({
        licenseKey,
        licenseEmail: data.email,
        licenseValidUntil: data.valid_until,
        licenseKeyHalf: data.key_half,
      });
    }

    return {
      valid: data.valid,
      email: data.email,
      plan: data.plan,
      validUntil: data.valid_until,
      keyHalf: data.key_half,
    };
  } catch (err: unknown) {
    // Allow offline use if previously validated (grace period)
    const config = loadConfig();
    if (config.licenseKeyHalf && config.licenseValidUntil) {
      const until = new Date(config.licenseValidUntil);
      if (until > new Date()) {
        return {
          valid: true,
          email: config.licenseEmail,
          validUntil: config.licenseValidUntil,
          keyHalf: config.licenseKeyHalf,
          error: 'Offline mode — using cached licence',
        };
      }
    }
    return { valid: false, error: `Network error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export function isLicenseValid(): boolean {
  const config = loadConfig();
  if (!config.licenseKeyHalf) return false;
  if (!config.licenseValidUntil) return false;
  return new Date(config.licenseValidUntil) > new Date();
}
