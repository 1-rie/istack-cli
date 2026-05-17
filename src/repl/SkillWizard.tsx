import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput, Select } from '@inkjs/ui';
import type { WizardQuestion, WizardOption } from '../skills/registry.js';

export type WizardAnswers = Record<string, string>;

type Props = {
  title?: string;
  questions: WizardQuestion[];
  onDone: (answers: WizardAnswers) => void;
  onCancel: () => void;
};

export function SkillWizard({ title = 'iStack', questions, onDone, onCancel }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<WizardAnswers>({});

  const current   = questions[stepIdx];
  const canGoBack = stepIdx > 0;

  useInput((_, key) => {
    if (!key.escape) return;
    if (canGoBack) setStepIdx(i => i - 1);
    else onCancel();
  });

  const advance = (value: string) => {
    const next = { ...answers, [current.id]: value };
    setAnswers(next);
    if (stepIdx < questions.length - 1) setStepIdx(i => i + 1);
    else onDone(next);
  };

  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>

      {/* Header */}
      <Box marginBottom={1} justifyContent="space-between">
        <Text color="cyan" bold>◆  {title}</Text>
        <Text dimColor>{canGoBack ? 'Esc to go back' : 'Esc to cancel'}</Text>
      </Box>

      {/* Breadcrumb */}
      <Box marginBottom={1} gap={1}>
        {questions.map((q, i) => {
          const isDone    = i < stepIdx;
          const isCurrent = i === stepIdx;
          return (
            <Text key={q.id}
              color={isCurrent ? 'cyan' : isDone ? 'green' : undefined}
              dimColor={!isCurrent && !isDone}
              bold={isCurrent}
            >
              {isDone ? '✓' : isCurrent ? '▶' : '○'} {q.label}
              {i < questions.length - 1 ? <Text dimColor>  ·  </Text> : null}
            </Text>
          );
        })}
      </Box>

      {/* Hint */}
      <Text dimColor>  {current.hint}</Text>

      {/* Input — varies by type — key forces remount on step change, clearing the field */}
      <Box marginTop={1} key={current.id}>
        {(!current.type || current.type === 'text') && (
          <>
            <Text color="green" bold>  ▶  </Text>
            <TextInput
              placeholder={current.placeholder ?? ''}
              onSubmit={(v) => { if (v.trim()) advance(v.trim()); }}
            />
          </>
        )}

        {current.type === 'select' && current.options && (
          <Box marginLeft={2} flexDirection="column">
            <Text dimColor>  ↑ ↓ to navigate  ·  Enter to select</Text>
            <Box marginTop={1} marginLeft={1}>
              <Select
                options={current.options.map(o => ({ label: o.label, value: o.value }))}
                onChange={(v) => advance(v)}
              />
            </Box>
          </Box>
        )}

        {current.type === 'multiselect' && current.options && (
          <MultiSelect options={current.options} onDone={(vals) => advance(vals.join(', '))} />
        )}
      </Box>

    </Box>
  );
}

function MultiSelect({ options, onDone }: { options: WizardOption[]; onDone: (values: string[]) => void }) {
  const [cursor, setCursor]   = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useInput((ch, key) => {
    if (key.upArrow)   setCursor(c => Math.max(0, c - 1));
    if (key.downArrow) setCursor(c => Math.min(options.length - 1, c + 1));
    if (ch === ' ') {
      setSelected(s => {
        const next = new Set(s);
        const val  = options[cursor].value;
        next.has(val) ? next.delete(val) : next.add(val);
        return next;
      });
    }
    if (key.return) {
      const vals = options.filter(o => selected.has(o.value)).map(o => o.value);
      onDone(vals.length ? vals : [options[cursor].value]);
    }
  });

  return (
    <Box flexDirection="column" marginLeft={2}>
      <Text dimColor>  ↑ ↓ to navigate  ·  Space to toggle  ·  Enter to confirm</Text>
      <Box marginTop={1} flexDirection="column">
        {options.map((opt, i) => (
          <Text key={opt.value} color={i === cursor ? 'cyan' : undefined} bold={i === cursor}>
            {'  '}{selected.has(opt.value) ? '◉' : '○'}{'  '}{opt.label}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
