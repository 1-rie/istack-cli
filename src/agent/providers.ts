import type { Config } from '../auth/config.js';
import type { ToolDefinition } from '../tools/registry.js';

export type ToolCall = {
  id: string;
  name: string;
  input: unknown;
};

export type TurnResult = {
  text: string;
  toolCalls: ToolCall[];
  rawContent: unknown; // provider-specific, passed back for tool results
};

export type StreamTurnOptions = {
  messages: Array<{ role: 'user' | 'assistant'; content: any }>;
  system?: string;
  tools: ToolDefinition[];
  onToken: (token: string) => void;
};

export interface AIClient {
  streamTurn(opts: StreamTurnOptions): Promise<TurnResult>;
  appendToolResults(
    messages: Array<{ role: string; content: any }>,
    rawAssistantContent: unknown,
    results: Array<{ toolUseId: string; content: string }>
  ): Array<{ role: string; content: any }>;
}

export function createAIClient(config: Config): AIClient {
  switch (config.provider ?? 'anthropic') {
    case 'anthropic': return new AnthropicClient(config);
    case 'openai':    return new OpenAIClient(config);
    case 'gemini':    return new GeminiClient(config);
    default:          return new AnthropicClient(config);
  }
}

// ─── Anthropic ────────────────────────────────────────────────────────────────

class AnthropicClient implements AIClient {
  private apiKey: string;
  private model: string;

  constructor(config: Config) {
    if (!config.anthropicKey) throw new Error('Anthropic API key not set. Run: istack login');
    this.apiKey = config.anthropicKey;
    this.model = config.model ?? 'claude-sonnet-4-6';
  }

  async streamTurn(opts: StreamTurnOptions): Promise<TurnResult> {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: this.apiKey });

    const stream = client.messages.stream({
      model: this.model,
      max_tokens: 8192,
      system: opts.system,
      tools: opts.tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema,
      })),
      messages: opts.messages,
    });

    let text = '';
    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        text += event.delta.text;
        opts.onToken(event.delta.text);
      }
    }

    const final = await stream.finalMessage();
    const toolCalls: ToolCall[] = final.content
      .filter(b => b.type === 'tool_use')
      .map(b => {
        if (b.type !== 'tool_use') throw new Error('unreachable');
        return { id: b.id, name: b.name, input: b.input };
      });

    return { text, toolCalls, rawContent: final.content };
  }

  appendToolResults(messages: any[], rawContent: unknown, results: Array<{ toolUseId: string; content: string }>) {
    return [
      ...messages,
      { role: 'assistant', content: rawContent },
      {
        role: 'user',
        content: results.map(r => ({
          type: 'tool_result',
          tool_use_id: r.toolUseId,
          content: r.content,
        })),
      },
    ];
  }
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

class OpenAIClient implements AIClient {
  private apiKey: string;
  private model: string;

  constructor(config: Config) {
    if (!config.openaiKey) throw new Error('OpenAI API key not set. Run: istack login');
    this.apiKey = config.openaiKey;
    this.model = config.model ?? 'gpt-4o';
  }

  async streamTurn(opts: StreamTurnOptions): Promise<TurnResult> {
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: this.apiKey });

    const systemMessages = opts.system
      ? [{ role: 'system' as const, content: opts.system }]
      : [];

    const stream = await client.chat.completions.create({
      model: this.model,
      stream: true,
      tools: opts.tools.map(t => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema,
        },
      })),
      messages: [
        ...systemMessages,
        ...opts.messages,
      ],
    });

    let text = '';
    const toolCallsMap = new Map<number, { id: string; name: string; args: string }>();

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        text += delta.content;
        opts.onToken(delta.content);
      }
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const existing = toolCallsMap.get(tc.index) ?? { id: '', name: '', args: '' };
          toolCallsMap.set(tc.index, {
            id: tc.id ?? existing.id,
            name: tc.function?.name ?? existing.name,
            args: existing.args + (tc.function?.arguments ?? ''),
          });
        }
      }
    }

    const toolCalls: ToolCall[] = Array.from(toolCallsMap.values()).map(tc => ({
      id: tc.id,
      name: tc.name,
      input: JSON.parse(tc.args || '{}'),
    }));

    return { text, toolCalls, rawContent: { text, toolCalls } };
  }

  appendToolResults(messages: any[], rawContent: any, results: Array<{ toolUseId: string; content: string }>) {
    const assistantMsg = {
      role: 'assistant',
      content: rawContent.text || '',
      tool_calls: rawContent.toolCalls.map((tc: ToolCall) => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: JSON.stringify(tc.input) },
      })),
    };
    const toolMsgs = results.map(r => ({
      role: 'tool',
      tool_call_id: r.toolUseId,
      content: r.content,
    }));
    return [...messages, assistantMsg, ...toolMsgs];
  }
}

// ─── Gemini ───────────────────────────────────────────────────────────────────

class GeminiClient implements AIClient {
  private apiKey: string;
  private model: string;

  constructor(config: Config) {
    if (!config.geminiKey) throw new Error('Gemini API key not set. Run: istack login');
    this.apiKey = config.geminiKey;
    this.model = config.model ?? 'gemini-2.0-flash-exp';
  }

  async streamTurn(opts: StreamTurnOptions): Promise<TurnResult> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: opts.system,
      tools: [{
        functionDeclarations: opts.tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.inputSchema as any,
        })),
      }],
    });

    const history = opts.messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: typeof m.content === 'string'
        ? [{ text: m.content }]
        : m.content,
    }));

    const lastMsg = opts.messages[opts.messages.length - 1];
    const chat = model.startChat({ history });
    const result = await chat.sendMessageStream(lastMsg.content);

    let text = '';
    for await (const chunk of result.stream) {
      const t = chunk.text();
      if (t) { text += t; opts.onToken(t); }
    }

    const final = await result.response;
    const toolCalls: ToolCall[] = (final.functionCalls() ?? []).map((fc, i) => ({
      id: `gemini-tc-${i}`,
      name: fc.name,
      input: fc.args,
    }));

    return { text, toolCalls, rawContent: { text, toolCalls, finalResponse: final } };
  }

  appendToolResults(messages: any[], rawContent: any, results: Array<{ toolUseId: string; content: string }>) {
    const { toolCalls } = rawContent as { toolCalls: ToolCall[] };
    const modelMsg = {
      role: 'model',
      parts: [
        ...(rawContent.text ? [{ text: rawContent.text }] : []),
        ...toolCalls.map(tc => ({ functionCall: { name: tc.name, args: tc.input } })),
      ],
    };
    const toolMsg = {
      role: 'user',
      parts: toolCalls.map((tc, i) => ({
        functionResponse: {
          name: tc.name,
          response: { content: results[i]?.content ?? '' },
        },
      })),
    };
    return [...messages, modelMsg, toolMsg];
  }
}
