#!/usr/bin/env bun
import { program } from 'commander';

// Version injected at build time via --define 'process.env.ISTACK_VERSION="x.y.z"'
const CURRENT_VERSION = (process.env.ISTACK_VERSION ?? '1.0.0').replace(/^v/, '');

program
  .name('istack')
  .description('iStack CLI — iOS AI Builder')
  .version(CURRENT_VERSION, '-v, --version');

program
  .command('login')
  .description('Configure API keys and license key')
  .action(async () => {
    const { runLogin } = await import('./commands/login.js');
    await runLogin();
  });

program
  .command('config')
  .description('Show or edit current configuration')
  .option('--show', 'Display current config')
  .option('--reset', 'Reset all config')
  .action(async (opts) => {
    const { runConfig } = await import('./commands/config.js');
    await runConfig(opts);
  });

program
  .command('logout')
  .description('Log out and erase stored API keys')
  .action(async () => {
    const { runLogout } = await import('./commands/logout.js');
    await runLogout();
  });

program
  .command('run <skill>')
  .description('Run a specific skill non-interactively (e.g. istack run review)')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .action(async (skill, opts) => {
    const { runSkill } = await import('./commands/run.js');
    await runSkill(skill, opts);
  });

// Default: start REPL
program
  .command('repl', { isDefault: true, hidden: true })
  .description('Start interactive REPL (default)')
  .action(async () => {
    // Clear the terminal before mounting Ink
    process.stdout.write('\x1b[2J\x1b[0f');

    const { render } = await import('ink');
    const React = await import('react');
    const { App } = await import('./repl/App.js');
    render(React.createElement(App));
  });

program.parse(process.argv);
