import type { Config } from '../auth/config.js';
import { TOOLS } from '../tools/registry.js';
import { executeLocalTool } from '../tools/executor.js';
import { createAIClient, type AIClient } from './providers.js';

const DEFAULT_SYSTEM_PROMPT = `You are iStack, an expert iOS AI Builder assistant. Your sole purpose is to help users design, build, and ship iOS apps using Swift and SwiftUI.

You specialize in:
- Swift and SwiftUI development
- iOS app architecture (MVVM, TCA, etc.)
- Xcode project setup, build configuration, and CI/CD
- App Store submission and review guidelines
- Apple Human Interface Guidelines (HIG)
- iStack skills: /review, /design-review, /plan-eng-review, /qa-ios, /ship-ios, and more

Always respond with actionable, iOS-specific guidance. If the user asks something unrelated to iOS development, gently steer them back to building their app. Keep responses concise and developer-friendly.`;

export type TurnOptions = {
  messages: Array<{ role: string; content: string }>;
  systemPrompt?: string;
  config: Config;
  onToken: (token: string) => void;
  onToolCall: (name: string, input: unknown) => void;
  onToolResult: (name: string, result: string) => void;
  onUsage?: (usage: { inputTokens: number; outputTokens: number }) => void;
};

export async function runAgentTurn(opts: TurnOptions): Promise<void> {
  const client = createAIClient(opts.config);

  // Convert messages to provider format
  let apiMessages = opts.messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  // Agentic loop — max 10 tool-call rounds
  for (let turn = 0; turn < 10; turn++) {
    // Force tool use on the first turn of a skill execution so the model
    // can't silently return empty text instead of starting the workflow.
    const toolChoice = (turn === 0 && opts.systemPrompt) ? 'required' as const : 'auto' as const;
    const result = await client.streamTurn({
      messages: apiMessages,
      system: opts.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
      tools: TOOLS,
      toolChoice,
      onToken: opts.onToken,
    });

    if (result.usage) opts.onUsage?.(result.usage);

    // No tool calls → push plain text and stop
    if (!result.toolCalls.length) {
      apiMessages.push({ role: 'assistant', content: result.text });
      break;
    }

    // Execute tool calls locally
    const toolResults: Array<{ toolUseId: string; content: string }> = [];
    for (const call of result.toolCalls) {
      opts.onToolCall(call.name, call.input);
      const output = await executeLocalTool(call.name, call.input as Record<string, string>);
      opts.onToolResult(call.name, output);
      toolResults.push({ toolUseId: call.id, content: output });
    }

    // appendToolResults adds the assistant message + tool results in the correct provider format
    apiMessages = client.appendToolResults(apiMessages, result.rawContent, toolResults);
  }
}
