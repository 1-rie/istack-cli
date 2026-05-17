import { createInterface } from 'readline';
import chalk from 'chalk';
import { mergeConfig, loadConfig, type Provider } from '../auth/config.js';
import { validateLicense } from '../auth/license.js';
import { MODEL_OPTIONS, DEFAULT_MODEL } from '../models.js';

function prompt(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

export async function runLogin() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log('');
  console.log(chalk.cyan.bold('  iStack CLI — Login'));
  console.log(chalk.dim('  Configure your license and AI provider\n'));

  const config = loadConfig();

  // ── 1. iStack license key (required) ───────────────────────────────────────
  let licenseKey = config.licenseKey ?? '';
  while (true) {
    const existingHint = licenseKey ? `[${licenseKey.slice(0, 12)}…] ` : '';
    const licenseInput = await prompt(rl, chalk.green(`  ▶ iStack license key ${existingHint}: `));
    const entered = licenseInput.trim();
    if (!entered && licenseKey) break; // keep existing valid key
    if (!entered) {
      console.log(chalk.red('  ✖  A valid iStack license is required. Get one at istack.dev'));
      continue;
    }
    process.stdout.write(chalk.dim('  Validating… '));
    const result = await validateLicense(entered);
    if (result.valid) {
      console.log(chalk.green('✓'));
      console.log(chalk.dim(`  Plan: ${result.plan ?? 'Pro'}  ·  Expires: ${result.validUntil ?? 'N/A'}`));
      licenseKey = entered;
      break;
    } else {
      console.log(chalk.red('✗'));
      console.log(chalk.red(`  ✖  ${result.error}`));
    }
  }
  console.log('');

  // ── 2. Provider selection ───────────────────────────────────────────────────
  console.log(chalk.white('  AI Provider:'));
  console.log(chalk.dim('    1) Anthropic (Claude) — recommended'));
  console.log(chalk.dim('    2) OpenAI (GPT / o-series)'));
  console.log(chalk.dim('    3) Google Gemini'));
  const providerChoice = await prompt(rl, chalk.green('  ▶ Choice [1]: '));
  const provider: Provider =
    (['anthropic', 'openai', 'gemini'] as Provider[])[Number(providerChoice || '1') - 1] ?? 'anthropic';
  mergeConfig({ provider });

  // ── 3. API key ──────────────────────────────────────────────────────────────
  const keyMap: Record<Provider, keyof typeof config> = {
    anthropic: 'anthropicKey',
    openai:    'openaiKey',
    gemini:    'geminiKey',
  };
  const existingKey = config[keyMap[provider]];
  const keyHint     = existingKey ? `[${(existingKey as string).slice(0, 8)}…] ` : '';
  const placeholders: Record<Provider, string> = {
    anthropic: 'sk-ant-api03-…',
    openai:    'sk-proj-…',
    gemini:    'AIzaSy…',
  };
  const apiKey = await prompt(rl, chalk.green(`  ▶ ${provider} API key ${keyHint}(${placeholders[provider]}): `));
  if (apiKey.trim()) {
    if (provider === 'anthropic') mergeConfig({ anthropicKey: apiKey.trim() });
    else if (provider === 'openai')  mergeConfig({ openaiKey:  apiKey.trim() });
    else if (provider === 'gemini')  mergeConfig({ geminiKey:  apiKey.trim() });
  }

  // ── 4. Model selection ──────────────────────────────────────────────────────
  console.log('');
  console.log(chalk.white('  Model:'));
  const models = MODEL_OPTIONS[provider];
  models.forEach((m, i) => {
    console.log(chalk.dim(`    ${i + 1}) ${m.label}`));
  });
  const defaultModel = DEFAULT_MODEL[provider];
  const modelChoice  = await prompt(rl, chalk.green(`  ▶ Choice [1 = ${defaultModel}]: `));
  const chosenModel  = models[Number(modelChoice || '1') - 1]?.value ?? defaultModel;
  mergeConfig({ model: chosenModel });

  rl.close();

  console.log('');
  console.log(chalk.cyan('  Saved to ~/.istack/config.json'));
  console.log(chalk.dim(`  Model: ${chosenModel}`));
  console.log(chalk.white.bold('  Run `istack` to open the REPL'));
  console.log('');
}
