import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { join, resolve, dirname, extname } from 'path';
import { execSync } from 'child_process';

// Project root = cwd where the user invoked istack
const PROJECT_ROOT = process.cwd();

// Safety: prevent path traversal outside project
function safePath(relativePath: string): string {
  const full = resolve(PROJECT_ROOT, relativePath);
  if (!full.startsWith(PROJECT_ROOT)) {
    throw new Error(`Path traversal blocked: ${relativePath}`);
  }
  return full;
}

export async function executeLocalTool(
  name: string,
  input: Record<string, string>
): Promise<string> {
  try {
    switch (name) {
      case 'read_file':     return toolReadFile(input);
      case 'write_file':    return toolWriteFile(input);
      case 'list_files':    return toolListFiles(input);
      case 'run_bash':      return toolRunBash(input);
      case 'search_in_files': return toolSearchInFiles(input);
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err: unknown) {
    return `Tool error (${name}): ${err instanceof Error ? err.message : String(err)}`;
  }
}

function toolReadFile(input: Record<string, string>): string {
  const path = safePath(input.path);
  if (!existsSync(path)) return `File not found: ${input.path}`;
  const content = readFileSync(path, 'utf8');
  const lines = content.split('\n');
  // Return with line numbers for easier AI references
  const numbered = lines.map((l, i) => `${String(i + 1).padStart(4, ' ')} | ${l}`).join('\n');
  return `File: ${input.path} (${lines.length} lines)\n\n${numbered}`;
}

function toolWriteFile(input: Record<string, string>): string {
  const path = safePath(input.path);
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, input.content, 'utf8');
  return `Written: ${input.path} (${input.content.length} bytes)`;
}

function toolListFiles(input: Record<string, string>): string {
  const path = safePath(input.path ?? '.');
  if (!existsSync(path)) return `Directory not found: ${input.path}`;

  const recursive = input.recursive === 'true';
  const filter = input.filter ?? '';

  const files = listRecursive(path, recursive, filter);
  if (!files.length) return `No files found in ${input.path}`;

  const relative = files.map(f => f.replace(PROJECT_ROOT + '/', ''));
  return relative.join('\n');
}

function listRecursive(dir: string, recursive: boolean, filter: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue; // skip hidden
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive) result.push(...listRecursive(full, true, filter));
    } else {
      if (!filter || extname(entry.name) === filter) result.push(full);
    }
  }
  return result;
}

function toolRunBash(input: Record<string, string>): string {
  const workdir = input.workdir ? safePath(input.workdir) : PROJECT_ROOT;
  const command = input.command;

  // Basic safety: block obviously destructive commands
  const blocked = ['rm -rf /', 'sudo rm', ':(){:|:&};:', 'mkfs', 'dd if='];
  for (const b of blocked) {
    if (command.includes(b)) return `Blocked: command contains "${b}"`;
  }

  try {
    const output = execSync(command, {
      cwd: workdir,
      encoding: 'utf8',
      timeout: 60_000,
      maxBuffer: 1024 * 1024 * 10, // 10 MB
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return output || '(no output)';
  } catch (err: any) {
    const stdout = err.stdout ?? '';
    const stderr = err.stderr ?? '';
    return [stdout, stderr, `Exit code: ${err.status}`].filter(Boolean).join('\n');
  }
}

function toolSearchInFiles(input: Record<string, string>): string {
  const searchPath = input.path ? safePath(input.path) : PROJECT_ROOT;
  const pattern = input.pattern;
  const filePattern = input.file_pattern ?? '';

  const grepPattern = filePattern ? `--include="${filePattern}"` : '--include="*"';
  const command = `grep -r -n --color=never ${grepPattern} ${JSON.stringify(pattern)} ${JSON.stringify(searchPath)} 2>/dev/null | head -100`;

  try {
    const output = execSync(command, { encoding: 'utf8', timeout: 30_000 });
    const lines = output.trim().split('\n').filter(Boolean);
    if (!lines.length) return `No matches for: ${pattern}`;
    // Make paths relative
    return lines.map(l => l.replace(PROJECT_ROOT + '/', '')).join('\n');
  } catch {
    return `No matches for: ${pattern}`;
  }
}
