import React, { useState, useCallback, useRef } from 'react';
import { Box, Text, useApp, useStdout, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import Spinner from 'ink-spinner';
import { runAgentTurn } from '../agent/loop.js';
import { resolveSkill, listSkills } from '../skills/registry.js';
import { loadConfig, saveConfig } from '../auth/config.js';
import { LoginFlow } from './LoginFlow.js';
import { Splash } from './Splash.js';
import { Header } from './Header.js';

export type Message = {
  role: 'user' | 'assistant' | 'error';
  content: string;
};

type Screen = 'splash' | 'login' | 'repl';

function isLoggedIn(): boolean {
  const config = loadConfig();
  return !!(config.anthropicKey || config.openaiKey || config.geminiKey);
}

// Approximate header height in terminal rows
const HEADER_ROWS  = 13;
const INPUT_ROWS   = 3;
const MESSAGE_ROWS = 4; // rough rows per message

export function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();

  const [screen, setScreen]           = useState<Screen>('splash');
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState('');
  const [isLoading, setIsLoading]     = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState('');
  const [toolStatus, setToolStatus]     = useState('');
  const [ctrlCPending, setCtrlCPending] = useState(false);
  const ctrlCTimer = useRef<ReturnType<typeof setTimeout>>();

  // Double Ctrl+C to quit
  useInput((ch, key) => {
    if (key.ctrl && ch === 'c') {
      if (ctrlCPending) {
        clearTimeout(ctrlCTimer.current);
        exit();
      } else {
        setCtrlCPending(true);
        ctrlCTimer.current = setTimeout(() => setCtrlCPending(false), 2000);
      }
    }
  });

  // How many messages fit below the header
  const termRows    = stdout?.rows ?? 40;
  const maxVisible  = Math.max(2, Math.floor((termRows - HEADER_ROWS - INPUT_ROWS) / MESSAGE_ROWS));
  const visibleMsgs = messages.slice(-maxVisible);
  const hiddenCount = messages.length - visibleMsgs.length;

  const handleSplashDone = useCallback(() => {
    setScreen(isLoggedIn() ? 'repl' : 'login');
  }, []);

  const handleFirstLoginDone = useCallback((msg: string) => {
    setMessages([{ role: 'assistant', content: msg }]);
    setScreen('repl');
  }, []);

  const handleInlineLoginDone = useCallback((msg: string) => {
    setIsLoggingIn(false);
    setMessages(m => [...m, { role: 'assistant', content: msg }]);
  }, []);

  const handleSubmit = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    // ── Built-in commands ──────────────────────────────────────────────────
    if (trimmed === '/exit' || trimmed === '/quit') { exit(); return; }

    if (trimmed === '/login') {
      setInput('');
      setIsLoggingIn(true);
      return;
    }

    if (trimmed === '/logout') {
      setInput('');
      const config = loadConfig();
      saveConfig({ provider: config.provider, model: config.model });
      setMessages(m => [...m, {
        role: 'assistant',
        content: 'Logged out. API keys erased.\nType /login to reconnect.',
      }]);
      return;
    }

    if (trimmed === '/clear') {
      setMessages([]);
      setInput('');
      return;
    }

    if (trimmed === '/help') {
      const skills = listSkills();
      setMessages(m => [...m, {
        role: 'assistant',
        content: [
          'Available skills:',
          skills.map(s => `  /${s}`).join('\n'),
          '',
          'Built-in commands:',
          '  /login   — Configure API key + license',
          '  /logout  — Log out and erase API keys',
          '  /clear   — Clear conversation history',
          '  /help    — Show this help',
          '  /exit    — Quit iStack CLI',
        ].join('\n'),
      }]);
      setInput('');
      return;
    }

    // ── Agent turn ────────────────────────────────────────────────────────
    setInput('');
    setIsLoading(true);
    setStreamBuffer('');
    setToolStatus('');

    const userMsg: Message = { role: 'user', content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);

    try {
      const config = loadConfig();

      let systemPrompt: string | undefined;
      if (trimmed.startsWith('/')) {
        const skillName = trimmed.split(/\s+/)[0].slice(1);
        systemPrompt = await resolveSkill(skillName);
        if (!systemPrompt) {
          setMessages(m => [...m, {
            role: 'error',
            content: `Unknown skill: /${skillName}\nType /help to see available skills.`,
          }]);
          setIsLoading(false);
          return;
        }
      }

      let fullResponse = '';
      await runAgentTurn({
        messages: nextMessages,
        systemPrompt,
        config,
        onToken:      t  => { fullResponse += t; setStreamBuffer(fullResponse); },
        onToolCall:   n  => setToolStatus(`Running: ${n}`),
        onToolResult: () => setToolStatus(''),
      });

      setMessages(m => [...m, { role: 'assistant', content: fullResponse }]);
    } catch (err: unknown) {
      setMessages(m => [...m, {
        role: 'error',
        content: `Error: ${err instanceof Error ? err.message : String(err)}`,
      }]);
    } finally {
      setIsLoading(false);
      setStreamBuffer('');
      setToolStatus('');
    }
  }, [messages, exit]);

  // ── Splash ───────────────────────────────────────────────────────────────
  if (screen === 'splash') return <Splash onDone={handleSplashDone} />;

  // ── Ctrl+C confirm overlay (shown on login screen too) ───────────────────
  const ctrlCBanner = ctrlCPending ? (
    <Box paddingX={2} marginBottom={1}>
      <Text color="yellow" bold>⚠  Press Ctrl+C again to quit</Text>
    </Box>
  ) : null;

  // ── First-run login ──────────────────────────────────────────────────────
  if (screen === 'login') {
    return (
      <Box flexDirection="column">
        <Header />
        {ctrlCBanner}
        <Box paddingX={2} marginBottom={1}>
          <Text color="yellow">⚠  No API key found — please log in to continue.</Text>
        </Box>
        <LoginFlow onDone={handleFirstLoginDone} />
      </Box>
    );
  }

  // ── Main REPL ────────────────────────────────────────────────────────────
  return (
    <Box flexDirection="column">

      {/* Sticky header — always first child */}
      <Header />

      {/* Overflow indicator */}
      {hiddenCount > 0 && (
        <Box paddingX={2} marginBottom={1}>
          <Text dimColor>↑ {hiddenCount} earlier message{hiddenCount > 1 ? 's' : ''} — type /clear to reset</Text>
        </Box>
      )}

      {/* Visible message history */}
      {visibleMsgs.map((msg, i) => (
        <MessageBlock key={i} msg={msg} />
      ))}

      {/* Inline login */}
      {isLoggingIn && <LoginFlow onDone={handleInlineLoginDone} />}

      {/* Streaming output */}
      {isLoading && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="cyan" bold>◆  iStack</Text>
          <Box paddingLeft={3}>
            {streamBuffer
              ? <Text>{streamBuffer}</Text>
              : toolStatus
                ? <Text color="yellow"><Spinner type="dots" />  {toolStatus}</Text>
                : <Text color="cyan"><Spinner type="dots" />  Thinking…</Text>
            }
          </Box>
        </Box>
      )}

      {/* Ctrl+C confirm banner */}
      {ctrlCBanner}

      {/* Input */}
      {!isLoading && !isLoggingIn && (
        <Box marginTop={1}>
          <Text color="green" bold>▶  </Text>
          <TextInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            placeholder="Type a skill like /review, /plan-eng-review, or ask anything…"
          />
        </Box>
      )}

    </Box>
  );
}

function MessageBlock({ msg }: { msg: Message }) {
  const isUser  = msg.role === 'user';
  const isError = msg.role === 'error';
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={isUser ? 'green' : isError ? 'red' : 'cyan'} bold>
        {isUser ? '▶  You' : isError ? '✖  Error' : '◆  iStack'}
      </Text>
      <Box paddingLeft={3}>
        <Text color={isError ? 'red' : undefined}>{msg.content}</Text>
      </Box>
    </Box>
  );
}
