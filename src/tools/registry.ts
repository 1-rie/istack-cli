export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
};

export const TOOLS: ToolDefinition[] = [
  {
    name: 'read_file',
    description: 'Read the contents of a file in the current iOS project.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to project root' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write or overwrite a file in the current iOS project.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to project root' },
        content: { type: 'string', description: 'File content to write' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'list_files',
    description: 'List files in a directory of the current iOS project.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path relative to project root' },
        recursive: { type: 'boolean', description: 'Whether to list recursively (default: false)' },
        filter: { type: 'string', description: 'File extension filter, e.g. ".swift"' },
      },
      required: ['path'],
    },
  },
  {
    name: 'run_bash',
    description: 'Run a shell command in the project directory (xcodebuild, git, swift, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command to execute' },
        workdir: { type: 'string', description: 'Working directory (defaults to project root)' },
      },
      required: ['command'],
    },
  },
  {
    name: 'search_in_files',
    description: 'Search for a pattern in project files using grep.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Text or regex pattern to search for' },
        path: { type: 'string', description: 'Directory to search in (default: project root)' },
        file_pattern: { type: 'string', description: 'File glob pattern, e.g. "*.swift"' },
      },
      required: ['pattern'],
    },
  },
];
