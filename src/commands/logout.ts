import chalk from 'chalk';
import { loadConfig, saveConfig } from '../auth/config.js';

export async function runLogout() {
  const config = loadConfig();

  // Keep only provider/model preferences — erase all credentials
  saveConfig({
    provider: config.provider,
    model:    config.model,
  });

  console.log('');
  console.log(chalk.yellow('  Logged out successfully.'));
  console.log(chalk.dim('  API keys and license erased from ~/.istack/config.json'));
  console.log('');
  console.log(chalk.dim('  Run `istack login` or type /login to reconnect.'));
  console.log('');
}
