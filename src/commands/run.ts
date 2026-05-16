import chalk from 'chalk';
import { loadConfig } from '../auth/config.js';
import { resolveSkill } from '../skills/registry.js';
import { runAgentTurn } from '../agent/loop.js';

export async function runSkill(skillName: string, opts: { path?: string }) {
  const config = await loadConfig();
  const systemPrompt = await resolveSkill(skillName);

  if (!systemPrompt) {
    console.error(chalk.red(`Unknown skill: /${skillName}`));
    process.exit(1);
  }

  const userMessage = `Run /${skillName} on the project at ${opts.path ?? process.cwd()}`;

  process.stdout.write(chalk.cyan(`\n◆ iStack — running /${skillName}\n\n`));

  await runAgentTurn({
    messages: [{ role: 'user', content: userMessage }],
    systemPrompt,
    config,
    onToken: (token) => process.stdout.write(token),
    onToolCall: (name) => process.stderr.write(chalk.dim(`\n[${name}]\n`)),
    onToolResult: () => {},
  });

  console.log('');
}
