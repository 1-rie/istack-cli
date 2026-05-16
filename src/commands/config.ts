import chalk from 'chalk';
import { loadConfig, saveConfig } from '../auth/config.js';

export async function runConfig(opts: { show?: boolean; reset?: boolean }) {
  if (opts.reset) {
    saveConfig({});
    console.log(chalk.yellow('  Config reset.'));
    return;
  }

  const config = loadConfig();

  console.log('');
  console.log(chalk.cyan.bold('  iStack CLI — Current Config'));
  console.log('');
  console.log(`  Provider:        ${chalk.white(config.provider ?? '(not set)')}`);
  console.log(`  Model:           ${chalk.white(config.model ?? '(not set)')}`);

  const maskKey = (k?: string) => k ? `${k.slice(0, 8)}${'•'.repeat(20)}` : chalk.dim('(not set)');
  console.log(`  Anthropic key:   ${maskKey(config.anthropicKey)}`);
  console.log(`  OpenAI key:      ${maskKey(config.openaiKey)}`);
  console.log(`  Gemini key:      ${maskKey(config.geminiKey)}`);
  console.log('');
  console.log(`  License key:     ${maskKey(config.licenseKey)}`);
  console.log(`  License email:   ${chalk.white(config.licenseEmail ?? chalk.dim('(not set)'))}`);
  console.log(`  License valid:   ${chalk.white(config.licenseValidUntil ?? chalk.dim('(not set)'))}`);
  console.log('');
  console.log(chalk.dim('  Run `istack login` to update  ·  `istack config --reset` to clear all'));
  console.log('');
}
