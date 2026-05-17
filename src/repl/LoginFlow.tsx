import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput, Select } from '@inkjs/ui';
import Spinner from 'ink-spinner';
import { mergeConfig, type Provider } from '../auth/config.js';
import { validateLicense } from '../auth/license.js';
import { MODEL_OPTIONS, DEFAULT_MODEL } from '../models.js';

type Step = 'license' | 'validating' | 'provider' | 'api_key' | 'model';

type Props = {
  onDone: (message: string) => void;
};

const PROVIDER_OPTIONS = [
  { label: '🤖  Anthropic  (Claude)',    value: 'anthropic' },
  { label: '🟢  OpenAI     (GPT / o-series)', value: 'openai'    },
  { label: '💎  Gemini     (Flash / Pro)', value: 'gemini'    },
  { label: '✕   Exit',                   value: '__exit__'  },
];

const API_KEY_PLACEHOLDER: Record<Provider, string> = {
  anthropic: 'sk-ant-api03-…',
  openai:    'sk-proj-…',
  gemini:    'AIzaSy…',
};

// Steps that support Esc → back, and where they go
const BACK_MAP: Partial<Record<Step, Step>> = {
  provider: 'license',
  api_key:  'provider',
  model:    'api_key',
};

const STEP_LABELS: Record<Exclude<Step, 'validating'>, string> = {
  license:  'License',
  provider: 'Provider',
  api_key:  'API Key',
  model:    'Model',
};
const ORDERED_STEPS: Exclude<Step, 'validating'>[] = ['license', 'provider', 'api_key', 'model'];

export function LoginFlow({ onDone }: Props) {
  const [step, setStep]             = useState<Step>('license');
  const [provider, setProvider]     = useState<Provider>('anthropic');
  const [statusMsg, setStatusMsg]   = useState('');
  const [licenseError, setLicenseError] = useState('');

  useInput((_, key) => {
    if (!key.escape) return;
    const prev = BACK_MAP[step];
    if (prev) setStep(prev);
  });

  // ── Step handlers ──────────────────────────────────────────────────────────

  const handleLicense = async (value: string) => {
    const key = value.trim();
    if (!key) {
      setLicenseError('A valid iStack license is required. Get one at istack.dev');
      return;
    }
    setLicenseError('');
    setStep('validating');
    setStatusMsg('Validating iStack license…');
    const result = await validateLicense(key);
    if (result.valid) {
      setStatusMsg(`✓  ${result.email}  ·  ${result.plan}`);
      setTimeout(() => setStep('provider'), 600);
    } else {
      setLicenseError(result.error ?? 'Invalid license key');
      setStep('license');
    }
  };

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
    const config = { model: value };
    onDone(`✓  All set! Using ${config.model}`);
  };

  const canGoBack = step in BACK_MAP;
  const currentStepIdx = ORDERED_STEPS.indexOf(step as Exclude<Step, 'validating'>);

  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>

      {/* Header */}
      <Box marginBottom={1} justifyContent="space-between">
        <Text color="cyan" bold>◆  iStack Login</Text>
        {canGoBack && <Text dimColor>  Esc to go back</Text>}
      </Box>

      {/* Step breadcrumb */}
      <Box marginBottom={1} gap={1}>
        {ORDERED_STEPS.map((s, i) => {
          const isDone    = i < currentStepIdx;
          const isCurrent = s === step;
          return (
            <Text
              key={s}
              color={isCurrent ? 'cyan' : isDone ? 'green' : undefined}
              dimColor={!isCurrent && !isDone}
              bold={isCurrent}
            >
              {isDone ? '✓' : isCurrent ? '▶' : '○'} {STEP_LABELS[s]}
              {i < ORDERED_STEPS.length - 1 ? <Text dimColor>  ·  </Text> : null}
            </Text>
          );
        })}
      </Box>

      {/* ── Step: License ── */}
      {step === 'license' && (
        <Box flexDirection="column">
          <Box>
            <Text color="green">  ▶  iStack license key: </Text>
            <TextInput
              placeholder="ISTACK-XXXX-YYYY-ZZZZ"
              onSubmit={handleLicense}
            />
          </Box>
          {licenseError
            ? <Text color="red">     ✖  {licenseError}</Text>
            : <Text dimColor>     Enter your license key to continue  ·  istack.dev</Text>
          }
        </Box>
      )}

      {/* ── Step: Validating ── */}
      {step === 'validating' && (
        <Box paddingLeft={2}>
          <Text color="cyan"><Spinner type="dots" />  {statusMsg}</Text>
        </Box>
      )}

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
          <Text dimColor>  Provider: <Text color="white">{provider}</Text>   ·   ↑ ↓ to navigate  ·  Enter to confirm</Text>
          <Box marginTop={1} marginLeft={2}>
            <Select
              options={MODEL_OPTIONS[provider]}
              defaultValue={DEFAULT_MODEL[provider]}
              onChange={handleModel}
            />
          </Box>
        </Box>
      )}

    </Box>
  );
}
