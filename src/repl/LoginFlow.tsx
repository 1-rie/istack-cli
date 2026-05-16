import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput, Select } from '@inkjs/ui';
import Spinner from 'ink-spinner';
import { mergeConfig, type Provider } from '../auth/config.js';
import { validateLicense } from '../auth/license.js';

type Step = 'provider' | 'api_key' | 'model' | 'license' | 'validating';

type Props = {
  onDone: (message: string) => void;
};

// Exit is offered as the last option in the provider selector
const PROVIDER_OPTIONS = [
  { label: '🤖  Anthropic  (Claude Sonnet / Opus)', value: 'anthropic'  },
  { label: '🟢  OpenAI     (GPT-4o)',                value: 'openai'     },
  { label: '💎  Gemini     (Flash / Pro)',            value: 'gemini'     },
  { label: '✕   Exit',                               value: '__exit__'   },
];

const MODEL_OPTIONS: Record<Provider, Array<{ label: string; value: string }>> = {
  anthropic: [
    { label: 'claude-sonnet-4-6       — fast + smart  ✦ recommended', value: 'claude-sonnet-4-6'        },
    { label: 'claude-opus-4-7         — most capable',                 value: 'claude-opus-4-7'          },
    { label: 'claude-haiku-4-5        — cheapest + fastest',           value: 'claude-haiku-4-5-20251001' },
  ],
  openai: [
    { label: 'gpt-4o                  — fast + smart  ✦ recommended', value: 'gpt-4o'      },
    { label: 'gpt-4o-mini             — cheapest',                    value: 'gpt-4o-mini' },
    { label: 'o3                      — best reasoning',               value: 'o3'          },
  ],
  gemini: [
    { label: 'gemini-2.0-flash-exp    — fast  ✦ recommended', value: 'gemini-2.0-flash-exp' },
    { label: 'gemini-2.5-pro          — most capable',         value: 'gemini-2.5-pro'       },
    { label: 'gemini-2.5-flash        — balanced',             value: 'gemini-2.5-flash'     },
  ],
};

const API_KEY_PLACEHOLDER: Record<Provider, string> = {
  anthropic: 'sk-ant-api03-…',
  openai:    'sk-proj-…',
  gemini:    'AIzaSy…',
};

// Which steps support Esc → back, and where they go
const BACK_MAP: Partial<Record<Step, Step>> = {
  api_key: 'provider',
  model:   'api_key',
  license: 'model',
};

export function LoginFlow({ onDone }: Props) {
  const [step, setStep]           = useState<Step>('provider');
  const [provider, setProvider]   = useState<Provider>('anthropic');
  const [statusMsg, setStatusMsg] = useState('');

  // Global Esc → back navigation (active on any step that has a parent)
  useInput((_, key) => {
    if (!key.escape) return;
    const prev = BACK_MAP[step];
    if (prev) setStep(prev);
  });

  const handleProvider = (value: string) => {
    if (value === '__exit__') { onDone('Login cancelled.'); return; }
    const chosen = value as Provider;
    setProvider(chosen);
    mergeConfig({ provider: chosen });
    setStep('api_key');
  };

  const handleApiKey = (value: string) => {
    const key = value.trim();
    if (!key) return;
    if (provider === 'anthropic') mergeConfig({ anthropicKey: key });
    else if (provider === 'openai')  mergeConfig({ openaiKey:  key });
    else if (provider === 'gemini')  mergeConfig({ geminiKey:  key });
    setStep('model');
  };

  const handleModel = (value: string) => {
    mergeConfig({ model: value });
    setStep('license');
  };

  const handleLicense = async (value: string) => {
    const key = value.trim();
    if (!key) {
      onDone('No license key — running in dev mode.\nSkills load from skills-source/ on this machine.');
      return;
    }
    setStep('validating');
    setStatusMsg('Validating license…');
    const result = await validateLicense(key);
    if (result.valid) {
      onDone(`✓  Logged in — ${result.email}  ·  Plan: ${result.plan}  ·  Expires: ${result.validUntil}`);
    } else {
      onDone(`✗  Invalid license: ${result.error}\nType /login to try again.`);
    }
  };

  // Hint shown on steps that allow going back
  const canGoBack = step in BACK_MAP;

  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>

      {/* Header + back hint */}
      <Box marginBottom={1} justifyContent="space-between">
        <Text color="cyan" bold>◆  iStack Login</Text>
        {canGoBack && (
          <Text dimColor>  Esc to go back</Text>
        )}
      </Box>

      {/* Step breadcrumb */}
      <Box marginBottom={1} gap={1}>
        {(['provider', 'api_key', 'model', 'license'] as Step[]).map((s, i) => {
          const steps: Step[] = ['provider', 'api_key', 'model', 'license'];
          const currentIdx = steps.indexOf(step);
          const thisIdx    = steps.indexOf(s);
          const isDone     = thisIdx < currentIdx;
          const isCurrent  = s === step;
          const label      = ['Provider', 'API Key', 'Model', 'License'][i];
          return (
            <Text
              key={s}
              color={isCurrent ? 'cyan' : isDone ? 'green' : undefined}
              dimColor={!isCurrent && !isDone}
              bold={isCurrent}
            >
              {isDone ? '✓' : isCurrent ? '▶' : '○'} {label}
              {i < 3 ? <Text dimColor>  ·  </Text> : null}
            </Text>
          );
        })}
      </Box>

      {/* ── Step: Provider ── */}
      {step === 'provider' && (
        <Box flexDirection="column">
          <Text dimColor>  ↑ ↓ to navigate  ·  Enter to select</Text>
          <Box marginTop={1} marginLeft={2}>
            <Select options={PROVIDER_OPTIONS} onChange={handleProvider} />
          </Box>
        </Box>
      )}

      {/* ── Step: API Key ── */}
      {step === 'api_key' && (
        <Box flexDirection="column">
          <Text dimColor>
            {'  Provider: '}<Text color="white">{provider}</Text>
          </Text>
          <Box marginTop={1}>
            <Text color="green">  ▶  API Key: </Text>
            <TextInput
              placeholder={API_KEY_PLACEHOLDER[provider]}
              onSubmit={handleApiKey}
            />
          </Box>
          <Text dimColor>     Paste your key and press Enter</Text>
        </Box>
      )}

      {/* ── Step: Model ── */}
      {step === 'model' && (
        <Box flexDirection="column">
          <Text dimColor>  ↑ ↓ to navigate  ·  Enter to confirm  ·  Esc to go back</Text>
          <Box marginTop={1} marginLeft={2}>
            <Select options={MODEL_OPTIONS[provider]} onChange={handleModel} />
          </Box>
        </Box>
      )}

      {/* ── Step: License ── */}
      {step === 'license' && (
        <Box flexDirection="column">
          <Box>
            <Text color="green">  ▶  License key: </Text>
            <TextInput
              placeholder="ISTACK-XXXX-YYYY-ZZZZ  (Enter to skip)"
              onSubmit={handleLicense}
            />
          </Box>
          <Text dimColor>     Press Enter to skip and run in dev mode</Text>
        </Box>
      )}

      {/* ── Step: Validating ── */}
      {step === 'validating' && (
        <Box paddingLeft={2}>
          <Text color="cyan"><Spinner type="dots" />  {statusMsg}</Text>
        </Box>
      )}

    </Box>
  );
}
