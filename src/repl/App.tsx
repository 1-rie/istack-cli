import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Box, Text, useApp, useStdout, useInput } from 'ink';
import { TextInput, Select } from '@inkjs/ui';
import Spinner from 'ink-spinner';
import { homedir } from 'os';
import { runAgentTurn } from '../agent/loop.js';
import { resolveSkill, listSkills, type WizardQuestion } from '../skills/registry.js';

const INIT_APP_DEFAULT_QUESTIONS: WizardQuestion[] = [
  { id: 'name',        label: 'App Name',    hint: 'What is your app called?',                              placeholder: 'e.g. Dimi, Spark, Habify…'             },
  { id: 'description', label: 'Pitch',       hint: 'In one sentence — what does it do and who is it for?', placeholder: 'e.g. A habit tracker for busy parents'  },
  { id: 'feature',     label: 'Key Feature', hint: 'What is the single most important feature for v1?',    placeholder: 'e.g. Daily streaks with push reminders' },
];

// Used when init-app skill isn't available (dev mode without skills)
const INIT_APP_FALLBACK_PROMPT = `You are iStack, an iOS app project initiator. Your job is to plan and scaffold a new iOS SwiftUI app interactively.

Your FIRST response must ask exactly these three questions (nothing else):
1. What's the name of your app?
2. In one sentence — what does it do and who is it for?
3. What's the single most important feature for v1?

After they answer, you will produce:
- Proposed architecture (MVVM or TCA)
- 3–5 key screens with their purpose
- Core data model (types and relationships)
- First sprint plan (what to build in week 1)

Be concise and action-oriented. Never explain Xcode setup or Apple basics — assume the user has Xcode installed and knows Swift.`;
import { loadConfig, saveConfig, mergeConfig } from '../auth/config.js';
import { validateLicense } from '../auth/license.js';
import { checkForUpdate, UpdateResult } from '../updater.js';
import { ALL_MODEL_OPTIONS, MODEL_CTX } from '../models.js';
import { detectProject } from '../project.js';
import { LoginFlow } from './LoginFlow.js';
import { SkillWizard, type WizardAnswers } from './SkillWizard.js';
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

// Header height: border(2) + paddingY(2) + logo/title(8) + footer row(2) + marginBottom(1) = 15
const HEADER_ROWS  = 15;
const INPUT_ROWS   = 3;
const MESSAGE_ROWS = 4;
const CHROME_ROWS  = 5; // budget for banners, loading label, spacing

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
  const [updateInfo, setUpdateInfo]         = useState<UpdateResult | null>(null);
  const [licenseRevoked, setLicenseRevoked] = useState(false);
  const [isPickingModel, setIsPickingModel] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const [isNoProjectPrompt, setIsNoProjectPrompt] = useState(false);
  const [isFolderInput, setIsFolderInput]         = useState(false);
  const [cmdMenuIndex, setCmdMenuIndex] = useState(0);
  const [lastUsage, setLastUsage]       = useState<{ inputTokens: number; outputTokens: number } | null>(null);
  const [sessionOutTokens, setSessionOutTokens] = useState(0);
  const [wizardState, setWizardState] = useState<{
    title: string;
    questions: WizardQuestion[];
    systemPrompt: string;
  } | null>(null);
  const ctrlCTimer = useRef<ReturnType<typeof setTimeout>>();

  // Run background checks when entering the REPL
  useEffect(() => {
    if (screen !== 'repl') return;

    // Check for a newer release (cached 24h)
    checkForUpdate().then(result => {
      if (result.hasUpdate) setUpdateInfo(result);
    }).catch(() => {});

    // Re-validate license key against the server every startup
    const config = loadConfig();
    if (config.licenseKey) {
      validateLicense(config.licenseKey).then(result => {
        if (!result.valid && !result.error?.startsWith('Network error')) {
          // Server explicitly rejected (revoked / expired) — clear cached key material
          mergeConfig({ licenseKeyHalf: undefined, licenseValidUntil: undefined });
          setLicenseRevoked(true);
        }
      }).catch(() => {});
    }

    // Proactive project detection
    if (messages.length === 0) {
      const project = detectProject();
      if (project.isIStackProject) {
        const name = project.projectName ? `**${project.projectName}**` : 'an iOS project';
        setMessages([{
          role: 'assistant',
          content: `I can see you're inside ${name} (${project.indicators.join(', ')}). Ready to help — what do you want to work on? You can run a skill like /review, /qa-ios, or just ask anything about the project.`,
        }]);
      } else {
        setIsNoProjectPrompt(true);
      }
    }
  }, [screen]);

  // All commands available in the menu
  const allCommands = useMemo(() => [
    'help', 'login', 'logout', 'clear', 'config models', 'exit',
    ...listSkills(),
  ], []);

  // Command menu: active when input starts with '/'
  const slashQuery   = input.startsWith('/') ? input.slice(1) : null;
  const filteredCmds = slashQuery !== null
    ? allCommands.filter(c => c.startsWith(slashQuery))
    : [];
  const safeMenuIndex = Math.min(cmdMenuIndex, Math.max(0, filteredCmds.length - 1));
  const showCmdMenu   = filteredCmds.length > 0
    && !isLoading && !isLoggingIn && !isPickingModel
    && !isNoProjectPrompt && !isFolderInput && !wizardState;

  // Reset selection when user types
  useEffect(() => { setCmdMenuIndex(0); }, [input]);

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

    if (!showCmdMenu) return;

    if (key.tab) {
      const selected = filteredCmds[safeMenuIndex];
      if (selected) {
        setInput('/' + selected);
        setInputKey(k => k + 1);
      }
    }

    if (key.upArrow) {
      setCmdMenuIndex(i => Math.max(0, i - 1));
    }

    if (key.downArrow) {
      setCmdMenuIndex(i => Math.min(filteredCmds.length - 1, i + 1));
    }

    if (key.escape) {
      setInput('');
      setInputKey(k => k + 1);
    }
  });

  // How many messages fit below the header — subtract chrome budget so total never exceeds termRows
  const termRows       = stdout?.rows ?? 40;
  const maxVisible     = Math.max(1, Math.floor((termRows - HEADER_ROWS - INPUT_ROWS - CHROME_ROWS) / MESSAGE_ROWS));
  const visibleMsgs    = messages.slice(-maxVisible);
  const hiddenCount    = messages.length - visibleMsgs.length;
  // Clamp streaming output so a long response can't push the header off screen
  const maxStreamLines = Math.max(1, termRows - HEADER_ROWS - CHROME_ROWS - 3);
  const displayBuffer  = streamBuffer
    ? streamBuffer.split('\n').slice(-maxStreamLines).join('\n')
    : '';

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

  const handleFolderSubmit = useCallback((rawPath: string) => {
    const expanded = rawPath.trim().replace(/^~/, homedir());
    try {
      process.chdir(expanded);
      const project = detectProject();
      setIsFolderInput(false);
      if (project.isIStackProject) {
        const name = project.projectName ? `**${project.projectName}**` : 'an iOS project';
        setMessages([{
          role: 'assistant',
          content: `Switched to ${name}. Ready to help — what do you want to work on?`,
        }]);
      } else {
        setMessages([{
          role: 'error',
          content: `No iOS project detected in ${expanded}.\nCheck that the folder contains an .xcodeproj or Swift files.`,
        }]);
        setIsNoProjectPrompt(true);
      }
    } catch {
      setIsFolderInput(false);
      setMessages([{ role: 'error', content: `Could not open folder: ${rawPath}` }]);
      setIsNoProjectPrompt(true);
    }
  }, []);

  const handleCreateNew = useCallback(async () => {
    setIsNoProjectPrompt(false);
    const skill = await resolveSkill('init-app').catch(() => null);
    setWizardState({
      title:        'New iOS App',
      questions:    skill?.questions.length ? skill.questions : INIT_APP_DEFAULT_QUESTIONS,
      systemPrompt: skill?.systemPrompt ?? INIT_APP_FALLBACK_PROMPT,
    });
  }, []);

  const handleWizardDone = useCallback(async (answers: WizardAnswers) => {
    const state = wizardState;
    setWizardState(null);
    if (!state) return;

    setIsLoading(true);
    setStreamBuffer('');
    setToolStatus('');

    const content = Object.entries(answers).map(([k, v]) => `${k}: ${v}`).join('\n');
    const userMsg: Message = { role: 'user', content };
    setMessages(m => [...m, userMsg]);

    try {
      const config = loadConfig();
      let fullResponse = '';
      await runAgentTurn({
        messages:     [...messages, userMsg],
        systemPrompt: state.systemPrompt,
        config,
        onToken:      t  => { fullResponse += t; setStreamBuffer(fullResponse); },
        onToolCall:   n  => setToolStatus(`Running: ${n}`),
        onToolResult: () => setToolStatus(''),
        onUsage:      u  => { setLastUsage(u); setSessionOutTokens(n => n + u.outputTokens); },
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
  }, [wizardState, messages]);

  const clearInput = useCallback(() => {
    setInput('');
    setInputKey(k => k + 1);
  }, []);

  const handleSubmit = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    // ── Built-in commands ──────────────────────────────────────────────────
    if (trimmed === '/exit' || trimmed === '/quit') { clearInput(); exit(); return; }

    if (trimmed === '/login') {
      clearInput();
      setIsLoggingIn(true);
      return;
    }

    if (trimmed === '/logout') {
      clearInput();
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
      clearInput();
      return;
    }

    if (trimmed === '/config models' || trimmed === '/config model') {
      clearInput();
      setIsPickingModel(true);
      return;
    }

    if (trimmed === '/help') {
      const skills = listSkills();
      const skillsSection = skills.length > 0
        ? ['Available skills:', skills.map(s => `  /${s}`).join('\n')]
        : ['Available skills:', '  (none — skills ship with the production binary, not in dev mode)'];
      setMessages(m => [...m, {
        role: 'assistant',
        content: [
          ...skillsSection,
          '',
          'Built-in commands:',
          '  /login          — Configure API key + license',
          '  /logout         — Log out and erase API keys',
          '  /config models  — Switch the active model',
          '  /clear          — Clear conversation history',
          '  /help           — Show this help',
          '  /exit           — Quit iStack CLI',
        ].join('\n'),
      }]);
      clearInput();
      return;
    }

    // ── Agent turn ────────────────────────────────────────────────────────
    clearInput();
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
        const skill = await resolveSkill(skillName);
        if (!skill) {
          const hint = listSkills().length === 0
            ? `Unknown skill: /${skillName}\nNo skills are loaded — skills ship with the production binary.\nRun: curl -fsSL https://istack.dev/install | bash`
            : `Unknown skill: /${skillName}\nType /help to see available skills.`;
          setMessages(m => [...m, { role: 'error', content: hint }]);
          setIsLoading(false);
          return;
        }
        if (skill.questions.length > 0) {
          setIsLoading(false);
          setWizardState({ title: skillName, questions: skill.questions, systemPrompt: skill.systemPrompt });
          return;
        }
        systemPrompt = skill.systemPrompt;
      }

      let fullResponse = '';
      await runAgentTurn({
        messages: nextMessages,
        systemPrompt,
        config,
        onToken:      t  => { fullResponse += t; setStreamBuffer(fullResponse); },
        onToolCall:   n  => setToolStatus(`Running: ${n}`),
        onToolResult: () => setToolStatus(''),
        onUsage:      u  => { setLastUsage(u); setSessionOutTokens(n => n + u.outputTokens); },
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
  }, [messages, exit, clearInput]);

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

      {/* Update available banner */}
      {updateInfo && (
        <Box paddingX={2} marginBottom={1}>
          <Text color="yellow" bold>
            {'↑ Update available: '}
          </Text>
          <Text color="yellow">
            {`v${updateInfo.currentVersion} → v${updateInfo.latestVersion}  •  run: curl -fsSL https://istack.dev/install | bash`}
          </Text>
        </Box>
      )}

      {/* License revoked banner */}
      {licenseRevoked && (
        <Box paddingX={2} marginBottom={1} flexDirection="column">
          <Text color="red" bold>✖  License revoked or expired.</Text>
          <Text color="red">   Renew at istack.dev — skills are disabled until a valid license is linked.</Text>
          <Text dimColor>   Run /login to enter a new license key.</Text>
        </Box>
      )}

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

      {/* No-project interactive prompt */}
      {isNoProjectPrompt && (
        <NoProjectPrompt
          onCreateNew={handleCreateNew}
          onSelectFolder={() => {
            setIsNoProjectPrompt(false);
            setIsFolderInput(true);
          }}
        />
      )}

      {/* Generic skill wizard */}
      {wizardState && (
        <SkillWizard
          title={wizardState.title}
          questions={wizardState.questions}
          onDone={handleWizardDone}
          onCancel={() => setWizardState(null)}
        />
      )}

      {/* Folder path input */}
      {isFolderInput && (
        <FolderInput onSubmit={handleFolderSubmit} onCancel={() => {
          setIsFolderInput(false);
          setIsNoProjectPrompt(true);
        }} />
      )}

      {/* Inline model picker */}
      {isPickingModel && (
        <ModelPicker
          onDone={(model) => {
            setIsPickingModel(false);
            if (model) {
              mergeConfig({ model });
              setMessages(m => [...m, { role: 'assistant', content: `✓  Model switched to ${model}` }]);
            } else {
              setMessages(m => [...m, { role: 'assistant', content: 'Model unchanged.' }]);
            }
          }}
        />
      )}

      {/* Streaming output */}
      {isLoading && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="cyan" bold>◆  iStack</Text>
          <Box paddingLeft={3}>
            {displayBuffer
              ? <Text>{displayBuffer}</Text>
              : toolStatus
                ? <Text color="yellow"><Spinner type="dots" />  {toolStatus}</Text>
                : <Text color="cyan"><Spinner type="dots" />  Thinking…</Text>
            }
          </Box>
        </Box>
      )}

      {/* Ctrl+C confirm banner */}
      {ctrlCBanner}

      {/* Input + current model hint */}
      {!isLoading && !isLoggingIn && !isPickingModel && !isNoProjectPrompt && !isFolderInput && !wizardState && (
        <Box flexDirection="column" marginTop={1}>
          {showCmdMenu && (
            <CommandMenu commands={filteredCmds} selectedIndex={safeMenuIndex} />
          )}
          <Box>
            <Text color="green" bold>▶  </Text>
            <TextInput
              key={inputKey}
              defaultValue={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              placeholder="Type a skill like /review, /plan-eng-review, or ask anything…"
            />
          </Box>
          <ModelStatusLine lastUsage={lastUsage} sessionOutTokens={sessionOutTokens} />
        </Box>
      )}

    </Box>
  );
}

function fmtTok(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function ModelStatusLine({
  lastUsage,
  sessionOutTokens,
}: {
  lastUsage: { inputTokens: number; outputTokens: number } | null;
  sessionOutTokens: number;
}) {
  const config  = loadConfig();
  const model   = config.model ?? '—';
  const ctxMax  = MODEL_CTX[model];
  const cwd     = process.cwd().replace(homedir(), '~');

  const sep = <Text dimColor>  ·  </Text>;

  return (
    <Box paddingLeft={3} marginTop={0} flexDirection="row" flexWrap="nowrap">
      <Text dimColor>{model}</Text>
      {lastUsage && ctxMax && (<>
        {sep}
        <Text dimColor>ctx </Text>
        <Text dimColor>{fmtTok(lastUsage.inputTokens)}/{fmtTok(ctxMax)}</Text>
      </>)}
      {sessionOutTokens > 0 && (<>
        {sep}
        <Text dimColor>{fmtTok(sessionOutTokens)} tok</Text>
      </>)}
      {sep}
      <Text dimColor>{cwd}</Text>
    </Box>
  );
}

function ModelPicker({ onDone }: { onDone: (model: string | null) => void }) {
  useInput((_, key) => {
    if (key.escape) onDone(null);
  });
  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>
      <Box marginBottom={1} justifyContent="space-between">
        <Text color="cyan" bold>◆  Switch Model</Text>
        <Text dimColor>  Esc to cancel</Text>
      </Box>
      <Text dimColor>  ↑ ↓ to navigate  ·  Enter to confirm</Text>
      <Box marginTop={1} marginLeft={2}>
        <Select options={ALL_MODEL_OPTIONS} onChange={(v) => onDone(v)} />
      </Box>
    </Box>
  );
}

const NO_PROJECT_OPTIONS = [
  { label: '✦  Create a new iOS app', value: 'create' },
  { label: '⌥  Open an existing project folder', value: 'folder' },
];

function NoProjectPrompt({ onCreateNew, onSelectFolder }: {
  onCreateNew: () => void;
  onSelectFolder: () => void;
}) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="cyan" bold>◆  iStack</Text>
      <Box paddingLeft={3} flexDirection="column">
        <Text>No iOS project detected here. What do you want to do?</Text>
        <Box marginTop={1} marginLeft={1}>
          <Select
            options={NO_PROJECT_OPTIONS}
            onChange={(v) => v === 'create' ? onCreateNew() : onSelectFolder()}
          />
        </Box>
      </Box>
    </Box>
  );
}

function FolderInput({ onSubmit, onCancel }: {
  onSubmit: (path: string) => void;
  onCancel: () => void;
}) {
  useInput((_, key) => { if (key.escape) onCancel(); });
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="cyan" bold>◆  iStack</Text>
      <Box paddingLeft={3} flexDirection="column">
        <Text>Enter the path to your iOS project: <Text dimColor>(Esc to go back)</Text></Text>
        <Box marginTop={1}>
          <Text color="green" bold>▶  </Text>
          <TextInput
            defaultValue=""
            placeholder="~/Projects/MyApp"
            onSubmit={(v) => { if (v.trim()) onSubmit(v); }}
          />
        </Box>
      </Box>
    </Box>
  );
}

function CommandMenu({ commands, selectedIndex }: { commands: string[]; selectedIndex: number }) {
  const MAX = 6;
  const visible = commands.slice(0, MAX);
  return (
    <Box flexDirection="column" paddingLeft={3} marginBottom={0}>
      {visible.map((cmd, i) => (
        <Box key={cmd}>
          <Text color={i === selectedIndex ? 'cyan' : undefined} bold={i === selectedIndex}>
            {i === selectedIndex ? '› ' : '  '}
          </Text>
          <Text color={i === selectedIndex ? 'cyan' : 'white'} bold={i === selectedIndex}>
            {'/' + cmd}
          </Text>
        </Box>
      ))}
      {commands.length > MAX && (
        <Box paddingLeft={2}><Text dimColor>+{commands.length - MAX} more…</Text></Box>
      )}
      <Box paddingLeft={2} marginTop={0}>
        <Text dimColor>↑↓ navigate  ·  Tab complete  ·  Esc dismiss</Text>
      </Box>
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
