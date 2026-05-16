import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

// Apple logo rows — built bottom (index 8) to top (index 0)
const APPLE: string[] = [
  '        ▐█▌        ',  // 0 leaf
  '      ████████     ',  // 1 top
  '   ████████████   ',  // 2 upper
  '  █████████████   ',  // 3 body
  '  █████  ███████  ',  // 4 notch
  '  ███████████████ ',  // 5 body
  '   █████████████  ',  // 6 lower
  '     █████████    ',  // 7 bottom
  '       █████      ',  // 8 tip
];

const TOTAL_ROWS = APPLE.length;

const FRAME_MS = 75;   // ms per build frame
const HOLD_MS  = 300;  // ms hold on complete apple before fade

type Phase = 'building' | 'holding' | 'done';

type Props = { onDone: () => void };

// Crane arm: rope shortens as brick rises
function craneLines(hookRow: number): string[] {
  const lines: string[] = [];
  lines.push(' ╔════════╗');
  lines.push(' ║ 🏗      ╠══╗');
  lines.push(' ╚═════════╝  ║');
  for (let i = 0; i < hookRow; i++) lines.push('              ║');
  lines.push('            🧱 ');
  return lines;
}

export function Splash({ onDone }: Props) {
  const [builtRows, setBuiltRows] = useState(0);
  const [phase, setPhase] = useState<Phase>('building');

  // Build apple row by row
  useEffect(() => {
    if (phase !== 'building') return;
    if (builtRows >= TOTAL_ROWS) { setPhase('holding'); return; }
    const t = setTimeout(() => setBuiltRows(r => r + 1), FRAME_MS);
    return () => clearTimeout(t);
  }, [builtRows, phase]);

  // Hold then call onDone
  useEffect(() => {
    if (phase !== 'holding') return;
    const t = setTimeout(() => { setPhase('done'); onDone(); }, HOLD_MS);
    return () => clearTimeout(t);
  }, [phase, onDone]);

  const visibleApple = APPLE.slice(TOTAL_ROWS - builtRows);
  const hiddenCount  = TOTAL_ROWS - builtRows;
  const hookRow      = Math.max(0, hiddenCount - 1);
  const crane        = craneLines(hookRow);

  if (phase === 'done') return null;

  return (
    <Box flexDirection="column" paddingX={3} paddingY={1}>
      <Box flexDirection="row" alignItems="flex-start">

        {/* Apple logo */}
        <Box flexDirection="column" minWidth={22}>
          {Array.from({ length: hiddenCount }).map((_, i) => (
            <Text key={`sp-${i}`}> </Text>
          ))}
          {visibleApple.map((row, i) => (
            <Text key={`a-${i}`} color="white">{row}</Text>
          ))}
        </Box>

        {/* Crane */}
        <Box flexDirection="column" marginLeft={2}>
          {crane.map((line, i) => (
            <Text key={`c-${i}`} color="yellow">{line}</Text>
          ))}
        </Box>

      </Box>

      {/* Loading hint */}
      <Box marginTop={1}>
        <Text dimColor>  Loading iStack CLI…</Text>
      </Box>
    </Box>
  );
}
