import { createInterface } from 'readline';
import chalk from 'chalk';
import { mergeConfig, loadConfig, type Provider } from '../auth/config.js';
import { validateLicense } from '../auth/license.js';

function prompt(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

export async function runLogin() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log('');
  console.log(chalk.cyan.bold('  iStack CLI — Login'));
  console.log(chalk.dim('  Configure your API key and license\n'));

  const config = loadConfig();

  // ── Provider selection ──────────────────────────────────────────────────────
  console.log(chalk.white('  AI Provider:'));
  console.log(chalk.dim('    1) Anthropic (Claude) — recommended'));
  console.log(chalk.dim('    2) OpenAI (GPT-4o)'));
  console.log(chalk.dim('    3) Google Gemini'));
  const providerChoice = await prompt(rl, chalk.green('  ▶ Choice [1]: '));
  const provider: Provider = ['anthropic', 'openai', 'gemini'][Number(providerChoice || '1') - 1] as Provider ?? 'anthropic';
  mergeConfig({ provider });

  // ── API key per provider ────────────────────────────────────────────────────
  if (provider === 'anthropic') {
    const existing = config.anthropicKey ? `[${config.anthropicKey.slice(0, 8)}…]` : '';
    const key = await prompt(rl, chalk.green(`  ▶ Anthropic API key ${existing}: `));
    if (key.trim()) mergeConfig({ anthropicKey: key.trim() });
  } else if (provider === 'openai') {
    const existing = config.openaiKey ? `[${config.openaiKey.slice(0, 8)}…]` : '';
    const key = await prompt(rl, chalk.green(`  ▶ OpenAI API key ${existing}: `));
    if (key.trim()) mergeConfig({ openaiKey: key.trim() });
  } else if (provider === 'gemini') {
    const existing = config.geminiKey ? `[${config.geminiKey.slice(0, 8)}…]` : '';
    const key = await prompt(rl, chalk.green(`  ▶ Gemini API key ${existing}: `));
    if (key.trim()) mergeConfig({ geminiKey: key.trim() });
  }

  // ── Model selection ─────────────────────────────────────────────────────────
  const defaultModels: Record<Provider, string> = {
    anthropic: 'claude-sonnet-4-6',
    openai: 'gpt-4o',
    gemini: 'gemini-2.0-flash-exp',
  };
  const defaultModel = defaultModels[provider];
  const model = await prompt(rl, chalk.green(`  ▶ Model [${defaultModel}]: `));
  mergeConfig({ model: model.trim() || defaultModel });

  // ── License key ─────────────────────────────────────────────────────────────
  console.log('');
  const existingLicense = config.licenseKey ? `[${config.licenseKey.slice(0, 12)}…]` : '';
  const licenseInput = await prompt(rl, chalk.green(`  ▶ iStack license key ${existingLicense}: `));
  const licenseKey = licenseInput.trim() || config.licenseKey || '';

  if (licenseKey) {
    process.stdout.write(chalk.dim('  Validating license... '));
    const result = await validateLicense(licenseKey);
    if (result.valid) {
      console.log(chalk.green('✓'));
      console.log(chalk.dim(`  Plan: ${result.plan ?? 'Pro'}  ·  Expires: ${result.validUntil ?? 'N/A'}`));
    } else {
      console.log(chalk.red('✗'));
      console.log(chalk.red(`  ${result.error}`));
      console.log(chalk.dim('  Skills will run in dev mode (requires skills-source/ on this machine)'));
    }
  } else {
    console.log(chalk.yellow('  No license key — running in dev mode'));
  }

  rl.close();

  console.log('');
  console.log(chalk.cyan('  Saved to ~/.istack/config.json'));
  console.log(chalk.white.bold('  Run `istack` to open the REPL'));
  console.log('');
}
