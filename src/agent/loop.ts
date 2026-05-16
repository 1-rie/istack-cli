import type { Config } from '../auth/config.js';
import { TOOLS } from '../tools/registry.js';
import { executeLocalTool } from '../tools/executor.js';
import { createAIClient, type AIClient } from './providers.js';

export type TurnOptions = {
  messages: Array<{ role: string; content: string }>;
  systemPrompt?: string;
  config: Config;
  onToken: (token: string) => void;
  onToolCall: (name: string, input: unknown) => void;
  onToolResult: (name: string, result: string) => void;
};

export async function runAgentTurn(opts: TurnOptions): Promise<void> {
  const client = createAIClient(opts.config);

  // Convert messages to provider format
  let apiMessages = opts.messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  // Agentic loop — max 10 tool-call rounds
  for (let turn = 0; turn < 10; turn++) {
    const result = await client.streamTurn({
      messages: apiMessages,
      system: opts.systemPrompt,
      tools: TOOLS,
      onToken: opts.onToken,
    });

    // Push assistant response
    apiMessages.push({ role: 'assistant', content: result.rawContent as any });

    // No tool calls → done
    if (!result.toolCalls.length) break;

    // Execute tool calls locally
    const toolResults: Array<{ toolUseId: string; content: string }> = [];
    for (const call of result.toolCalls) {
      opts.onToolCall(call.name, call.input);
      const output = await executeLocalTool(call.name, call.input as Record<string, string>);
      opts.onToolResult(call.name, output);
      toolResults.push({ toolUseId: call.id, content: output });
    }

    // Feed results back — format depends on provider
    apiMessages = client.appendToolResults(apiMessages, result.rawContent, toolResults);
  }
}
