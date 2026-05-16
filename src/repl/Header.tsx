import React from 'react';
import { Box, Text } from 'ink';
import { loadConfig } from '../auth/config.js';
import { userInfo } from 'os';

// ── Serif "1'" logo — Times New Roman style, 8 lines ─────────────────────────
//
//   Anatomy of a serif "1":
//   - Angled top stroke (the pen lift)
//   - Thin vertical stem
//   - Wide horizontal serifs at base
//   - Prime mark ʼ beside the top
//
const LOGO_ONE = [
  '    ╱█  ʼ ',
  '   ╱ █    ',
  '     █    ',
  '     █    ',
  '     █    ',
  '     █    ',
  '  ▄▄▄█▄▄▄ ',
  '  ▀▀▀▀▀▀▀ ',
];

// ── iStack ASCII title — 5 lines (block style) ────────────────────────────────
const ISTACK = [
  ' ██  ███████ ████████  █████   ██████ ██   ██',
  ' ██  ██         ██    ██   ██ ██      ██  ██ ',
  ' ██  ███████    ██    ███████ ██      █████  ',
  ' ██       ██    ██    ██   ██ ██      ██  ██ ',
  ' ██  ███████    ██    ██   ██  ██████ ██   ██',
];

export function Header() {
  const config = loadConfig();
  const email    = config.licenseEmail ?? userInfo().username;
  const plan     = config.plan as string | undefined;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
      marginBottom={1}
    >
      {/* ── Top row: logo + title ── */}
      <Box flexDirection="row" alignItems="flex-start">

        {/* Serif "1'" — left column */}
        <Box flexDirection="column" marginRight={3}>
          {LOGO_ONE.map((line, i) => (
            <Text key={i} color="white" bold>{line}</Text>
          ))}
        </Box>

        {/* iStack title — right column */}
        <Box flexDirection="column" justifyContent="center">
          {/* Spacer to vertically center the 5-line title inside the 8-line logo */}
          <Text> </Text>
          {ISTACK.map((line, i) => (
            <Text key={i} color="cyan" bold>{line}</Text>
          ))}
          <Text> </Text>

          {/* Tagline */}
          <Box marginTop={0} flexDirection="row" gap={2}>
            <Text color="white" bold>iOS AI Builder</Text>
            <Text dimColor>·</Text>
            <Text dimColor>Made by </Text>
            <Text color="white">imprimerie</Text>
          </Box>
        </Box>

      </Box>

      {/* ── Bottom row: user + website ── */}
      <Box
        marginTop={1}
        flexDirection="row"
        justifyContent="space-between"
      >
        <Box flexDirection="row" gap={1}>
          <Text dimColor>◉</Text>
          <Text color="white">{email}</Text>
          {plan && <Text dimColor> · {plan}</Text>}
        </Box>

        <Box flexDirection="row" gap={1}>
          <Text dimColor>More info & help →</Text>
          <Text color="cyan" bold>istack.dev</Text>
        </Box>
      </Box>

    </Box>
  );
}
