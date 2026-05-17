import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export type ProjectInfo = {
  isIStackProject: boolean;
  projectName: string | null;
  projectPath: string;
  indicators: string[];
};

export function detectProject(dir: string = process.cwd()): ProjectInfo {
  const indicators: string[] = [];
  let projectName: string | null = null;

  try {
    const entries = readdirSync(dir);

    // Xcode project
    const xcodeproj = entries.find(e => e.endsWith('.xcodeproj'));
    if (xcodeproj) {
      indicators.push('Xcode project');
      projectName = xcodeproj.replace('.xcodeproj', '');
    }

    const xcworkspace = entries.find(e => e.endsWith('.xcworkspace') && !e.includes('.xcodeproj'));
    if (xcworkspace) {
      indicators.push('Xcode workspace');
      if (!projectName) projectName = xcworkspace.replace('.xcworkspace', '');
    }

    // iStack marker
    if (existsSync(join(dir, '.istack'))) {
      indicators.push('.istack folder');
    }

    // CLAUDE.md with iStack references
    const claudeMd = join(dir, 'CLAUDE.md');
    if (existsSync(claudeMd)) {
      const content = readFileSync(claudeMd, 'utf8');
      if (content.toLowerCase().includes('istack') || content.toLowerCase().includes('ios')) {
        indicators.push('CLAUDE.md');
      }
    }

    // Swift files at root level
    const hasSwift = entries.some(e => e.endsWith('.swift'));
    if (hasSwift) indicators.push('Swift source files');

    // Package.swift (Swift Package Manager)
    if (entries.includes('Package.swift')) {
      indicators.push('Swift Package Manager');
      if (!projectName) projectName = dir.split('/').pop() ?? null;
    }
  } catch {
    // Unreadable directory — not a project
  }

  return {
    isIStackProject: indicators.length > 0,
    projectName,
    projectPath: dir,
    indicators,
  };
}
