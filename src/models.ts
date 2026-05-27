import type { Provider } from './auth/config.js';

export type ModelOption = { label: string; value: string };

export const MODEL_OPTIONS: Record<Provider, ModelOption[]> = {
  anthropic: [
    { label: 'claude-sonnet-4-6         — fast + smart       ✦ recommended', value: 'claude-sonnet-4-6'          },
    { label: 'claude-opus-4-7           — most capable',                      value: 'claude-opus-4-7'            },
    { label: 'claude-haiku-4-5          — fastest / cheapest',                value: 'claude-haiku-4-5-20251001'  },
    { label: 'claude-3-7-sonnet         — extended thinking',                 value: 'claude-3-7-sonnet-20250219' },
    { label: 'claude-3-5-sonnet         — balanced (stable)',                 value: 'claude-3-5-sonnet-20241022' },
    { label: 'claude-3-5-haiku          — lightweight (stable)',              value: 'claude-3-5-haiku-20241022'  },
    { label: 'claude-3-opus             — powerful (legacy)',                 value: 'claude-3-opus-20240229'     },
  ],
  openai: [
    { label: 'gpt-5.5                   — latest flagship    ✦ recommended', value: 'gpt-5.5'         },
    { label: 'gpt-4o                    — fast + smart',                      value: 'gpt-4o'          },
    { label: 'gpt-4o-mini               — cheapest / fastest',               value: 'gpt-4o-mini'     },
    { label: 'o3                        — most powerful reasoning',           value: 'o3'              },
    { label: 'o3-mini                   — affordable reasoning',              value: 'o3-mini'         },
    { label: 'o1                        — strong reasoning',                  value: 'o1'              },
    { label: 'o1-mini                   — fast reasoning',                    value: 'o1-mini'         },
    { label: 'gpt-4-turbo               — GPT-4 Turbo (legacy)',             value: 'gpt-4-turbo'     },
  ],
  gemini: [
    { label: 'gemini-2.0-flash-exp      — fast  ✦ recommended', value: 'gemini-2.0-flash-exp' },
    { label: 'gemini-2.5-pro            — most capable',         value: 'gemini-2.5-pro'       },
    { label: 'gemini-2.5-flash          — balanced',             value: 'gemini-2.5-flash'     },
  ],
};

export const DEFAULT_MODEL: Record<Provider, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai:    'gpt-4o',
  gemini:    'gemini-2.0-flash-exp',
};

/** Context window size (tokens) per model ID */
export const MODEL_CTX: Record<string, number> = {
  'claude-sonnet-4-6':          200_000,
  'claude-opus-4-7':            200_000,
  'claude-haiku-4-5-20251001':  200_000,
  'claude-3-7-sonnet-20250219': 200_000,
  'claude-3-5-sonnet-20241022': 200_000,
  'claude-3-5-haiku-20241022':  200_000,
  'claude-3-opus-20240229':     200_000,
  'gpt-5.5':     128_000,
  'gpt-4o':      128_000,
  'gpt-4o-mini': 128_000,
  'o3':          200_000,
  'o3-mini':     128_000,
  'o1':          128_000,
  'o1-mini':     128_000,
  'gpt-4-turbo': 128_000,
  'gemini-2.0-flash-exp': 1_048_576,
  'gemini-2.5-pro':       1_048_576,
  'gemini-2.5-flash':     1_048_576,
};

/** All options flattened, for use in /config models (provider-agnostic picker) */
export const ALL_MODEL_OPTIONS: ModelOption[] = [
  ...MODEL_OPTIONS.anthropic.map(o => ({ ...o, label: `[Anthropic]  ${o.label}` })),
  ...MODEL_OPTIONS.openai.map(o    => ({ ...o, label: `[OpenAI]     ${o.label}` })),
  ...MODEL_OPTIONS.gemini.map(o    => ({ ...o, label: `[Gemini]     ${o.label}` })),
];
