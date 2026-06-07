import { app, BrowserWindow } from 'electron';
import path from 'path';


import { registerIpc, trackWindowForIpc } from './ipc';
import { StateManager } from './state';
import { MemoryStore } from './memory';
import { ensureDataDir, loadState, AutoSaveController } from './persistence';
import { getDataPath } from './persistence/paths.js';
import { SessionTracker } from './session';
import { SystemPoller } from './system/poller.js';
import { buildMemoryContext, resolveEmotion, clampStat } from '../shared/utils/index.js';
import { deriveWeather } from '../shared/utils/sensory.js';
import { OnlineNeedsDecay, CooldownManager, ThoughtCycle } from './emotion/index.js';
import { applyInteraction } from './emotion/interaction-effects.js';
import { resolveEmotion as mainResolveEmotion } from './emotion/resolver.js';
import { sendDialog, sendAutonomousAction } from './ipc/dialog.js';
import { checkIgnore, createIgnoreState, resetIgnoreState } from './emotion/ignore-detection.js';
import type { IgnoreState } from './emotion/ignore-detection.js';
import { checkDiscomfort, createDiscomfortState } from './emotion/discomfort.js';
import type { DiscomfortState } from './emotion/discomfort.js';
import { evaluateOverride, applyOverride } from './emotion/expression-override.js';
import type { OverrideState } from './emotion/expression-override.js';
import type { Emotion } from '../shared/types/index.js';


interface AppServices {
  stateManager: StateManager;
  memoryStore: MemoryStore;
  autoSave: AutoSaveController;
  sessionTracker: SessionTracker;
  systemPoller: SystemPoller;
  onlineNeeds: OnlineNeedsDecay;
  cooldowns: CooldownManager;
  thoughtCycle: ThoughtCycle;
  ignoreState: IgnoreState;
  discomfortState: DiscomfortState;
  currentOverride: OverrideState;
  displayEmotion: Emotion;
}

let services: AppServices | null = null;
let needsInterval: ReturnType<typeof setInterval> | null = null;
let ignoreCheckInterval: ReturnType<typeof setInterval> | null = null;


const WINDOW_CONFIG = {
  show: true,
  width: 400,
  height: 600,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    backgroundThrottling: false,
    // CRITICAL: Allow ES module imports from file:// URLs.
    // Without this, <script type="module">import "./index.js"</script> fails
    // because Chromium blocks cross-origin module requests from file:// origins.
    webSecurity: false,
  },
  frame: false,
  resizable: false,
  alwaysOnTop: true,
  transparent: true,
  // KDE Plasma KWin compositor ignores alpha compositing for frameless
  // transparent windows unless the background color has a non-zero alpha
  // component (even #00000001 is enough to trigger compositing).
  // Using #01000000 — visually identical to #00000000 but forces KWin
  // to actually blend the window with the desktop.
  // NOTE: Do NOT set 'type' on Linux — all values (pop-up-menu, toolbar,
  // splash, dock) either disable alpha or hide the window from the taskbar
  // without fixing transparency on KDE.
  backgroundColor: '#01000000',
} satisfies Electron.BrowserWindowConstructorOptions;

const HTML_PATH = path.join(__dirname, '../../renderer/renderer/index.html');

const getDefaultPosition = (): { x: number; y: number } => {
  const display = require('electron').screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;

  return {
    x: Math.max(0, width - WINDOW_CONFIG.width - 20),
    y: Math.max(0, height - WINDOW_CONFIG.height - 20),
  };
};

const createWindow = (stateManager: StateManager): BrowserWindow => {
  const position = getDefaultPosition();
  const mainWindow = new BrowserWindow({ ...WINDOW_CONFIG, x: position.x, y: position.y });
  mainWindow.show();

  trackWindowForIpc(mainWindow);

  console.log(`Window created at ${position.x}, ${position.y} with size ${WINDOW_CONFIG.width}x${WINDOW_CONFIG.height}`);

  // Forward renderer console messages to main process stdout
  mainWindow.webContents.on('console-message', (_event, level, message) => {
    const prefix = level === 3 ? 'ERROR' : level === 2 ? 'WARN' : 'INFO';
    console.log(`[Renderer ${prefix}] ${message}`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Window] HTML loaded successfully');
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Window] HTML load FAILED: ${errorDescription} (code: ${errorCode}) url: ${validatedURL}`);
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error(`[Window] Render process gone! Reason: ${details.reason}, Exit code: ${details.exitCode}`);
  });

  void mainWindow.loadFile(HTML_PATH);

  // State change -> renderer
  stateManager.onStateChange((state) => {
    mainWindow.webContents.send('state:update', state);
  });

  return mainWindow;
};

const handleActivate = (): void => {
  if (BrowserWindow.getAllWindows().length === 0 && services !== null) {
    const { stateManager } = services;

    registerIpc({
      getState: () => stateManager.getState(),
      onAction: (event) => {
        stateManager.applyInteraction(event);
        services!.sessionTracker.onUserActivity();
      },
      sendSystemMetrics: (wc, metrics) => {
        wc.send('system:metrics', metrics);
      },
    });

    createWindow(stateManager);
  }
};

const handleWindowAllClosed = (): void => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
};

// --- Transparency & GPU setup (MUST run before app.whenReady) ---

// Enable transparent visuals (required by Linux X11 compositor for alpha blending)
app.commandLine.appendSwitch('enable-transparent-visuals');

// Disable GPU sandbox only (NOT the full --no-sandbox).
// --no-sandbox breaks Chromium's shared memory setup on Linux,
// causing "No such process (3)" errors when creating files in /dev/shm.
// --disable-gpu-sandbox is sufficient to avoid xdg-desktop-portal errors
// on KDE Plasma while keeping the renderer sandbox intact.
app.commandLine.appendSwitch('disable-gpu-sandbox');

// Ignore GPU denylist — allow WebGL even if the driver is on Chromium's denylist.
// The system has an NVIDIA RTX 5080; we want hardware acceleration, not SwiftShader.
app.commandLine.appendSwitch('ignore-gpu-blacklist');

// Allow ES module imports from file:// URLs.
// Chromium blocks cross-origin module requests from file:// origins by default.
// Since Noah loads all renderer assets from local files, we need this to allow
// <script type="module">import "./index.js"</script> to work.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('allow-file-access-from-files');
}

// Force X11 on Linux — Wayland + transparent windows have known Chromium bugs
// (Electron 34 still uses Chromium <120, where Wayland transparency was broken)
if (process.platform === 'linux') {
  process.env['ELECTRON_OZONE_PLATFORM_HINT'] = 'x11';
  // Force NVIDIA GPU on multi-GPU systems (NVIDIA Optimus / AMD PRIME).
  // Without this, Electron may pick the AMD integrated GPU which lacks
  // proper GLX support, causing the GPU process to crash.
  process.env['__GLX_VENDOR_LIBRARY_NAME'] = 'nvidia';
}

const bootstrap = async (): Promise<void> => {
  await app.whenReady();

  // 1. Ensure data directory exists
  const dataDir = ensureDataDir(getDataPath());

  // 2. Load persisted state (with backup recovery)
  const persisted = loadState(dataDir);

  // 3. Create default state if no persisted state
  const initialState = persisted ?? undefined;

  // 4. Initialize StateManager
  const stateManager = new StateManager(initialState);

  // 5. Initialize MemoryStore
  const memoryStore = new MemoryStore(dataDir);
  memoryStore.load();
  stateManager.setMemoryStore(memoryStore);

  // 6. Reconcile absence if app was closed
  if (persisted) {
    const offlineSeconds = Math.floor((Date.now() - persisted.lastSeen) / 1000);
    if (offlineSeconds > 0) {
      stateManager.reconcileAbsence(offlineSeconds);

      // Record 'woke' memory event
      memoryStore.record({
        type: 'woke',
        severity: 1,
        context: buildMemoryContext(stateManager.getState()),
        description: `App started after ${offlineSeconds >= 86400 ? `${Math.floor(offlineSeconds / 86400)}d` : `${Math.floor(offlineSeconds / 3600)}h`} offline`,
      });
    }
  }

  // 7. Initialize AutoSaveController
  const autoSave = new AutoSaveController(stateManager, memoryStore, dataDir);
  autoSave.start();

  // 8. Initialize SessionTracker
  const sessionTracker = new SessionTracker(
    {
      getState: () => stateManager.getState(),
      reconcileAbsence: (seconds: number) => stateManager.reconcileAbsence(seconds),
    },
    memoryStore,
  );
  sessionTracker.start();

  // 8.5 Initialize SystemPoller
  const systemPoller = new SystemPoller();

  // Slice 5: watched-process configuration (used for termination trauma/emotion updates)
  systemPoller.watchProcesses(['chrome', 'code', 'node']);

  systemPoller.onMetrics((metrics, sensation) => {
    const weather = deriveWeather(metrics);

    // Update state with current CPU load and derived weather
    stateManager.modify((draft) => ({
      ...draft,
      systemLoad: metrics.cpuLoad,
      systemWeather: weather,
    }));

    // Also push directly to all renderer windows
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('system:metrics', metrics);
    }

    console.log(`[System] CPU load: ${metrics.cpuLoad}% — Noah feels ${sensation} — Weather: ${weather}`);
  });

  systemPoller.onProcessChange((changes) => {
    for (const proc of changes.terminated) {
      const currentState = stateManager.getState();

      memoryStore.record({
        type: 'system_event',
        severity: 5,
        context: buildMemoryContext(currentState),
        description: `Watched process died: ${proc.name} (pid ${proc.pid})`,
      });

      stateManager.modify((draft) => {
        // Increase trauma by 10 per watched process death, capped at STAT_MAX (100).
        const newTrauma = clampStat(draft.trauma + 10);
        // Re-evaluate emotion so that trauma thresholds automatically push
        // Noah toward 'scared' (≥50) or 'traumatized' (≥80).
        const nextEmotion = resolveEmotion({ ...draft, trauma: newTrauma });

        return {
          ...draft,
          trauma: newTrauma,
          emotion: nextEmotion,
        };
      });
    }
  });


  systemPoller.start();

  // 9. Initialize Emotion Engine (Stage 6)
  const onlineNeeds = new OnlineNeedsDecay();
  const cooldowns = new CooldownManager();
  const thoughtCycle = new ThoughtCycle();
  let ignoreState = createIgnoreState();
  let discomfortState = createDiscomfortState();
  let currentOverride: OverrideState = null;
  let displayEmotion: Emotion = 'happy';

  // 9a. Needs decay timer (1 second interval)
  needsInterval = setInterval(() => {
    const state = stateManager.getState();
    const delta = onlineNeeds.tick(state, false); // isActive = false for now
    if (Object.keys(delta).length > 0) {
      stateManager.modify((draft) => {
        const merged = { ...draft, ...delta };

        // Handle auto-sleep trigger from OnlineNeedsDecay
        if ((delta as any).autoSleepTriggered) {
          memoryStore.record({
            type: 'slept',
            severity: 2,
            context: buildMemoryContext(merged as any),
            description: 'Auto-sleep triggered by fatigue > 80',
          });
          const wins = BrowserWindow.getAllWindows();
          if (wins.length > 0) {
            sendAutonomousAction(wins[0]!, { type: 'animation', payload: 'sleep' });
          }
        }

        // Handle waking up
        if (delta.isSleeping === false) {
          memoryStore.record({
            type: 'woke',
            severity: 1,
            context: buildMemoryContext(merged as any),
            description: 'Woke up after fatigue recovered',
          });
          const wins = BrowserWindow.getAllWindows();
          if (wins.length > 0) {
            sendDialog(wins[0]!, '...일어났다');
          }
        }

        const trueEmotion = mainResolveEmotion(merged);
        const evaluatedOverride = evaluateOverride(merged);
        const displayed = applyOverride(trueEmotion, evaluatedOverride);
        currentOverride = evaluatedOverride;
        displayEmotion = displayed;

        return {
          ...merged,
          emotion: displayed,
        };
      });
    }
  }, 1000);

  // 9b. Ignore detection check (every 10 seconds)
  ignoreCheckInterval = setInterval(() => {
    const state = stateManager.getState();

    // Reset ignore timer if user has interacted recently
    const now = Date.now();
    if (now - state.lastSeen < 60_000) {
      ignoreState = resetIgnoreState();
    }

    const result = checkIgnore(state, ignoreState);
    if (result.action || Object.keys(result.stateModifiers).length > 0) {
      stateManager.modify((draft) => {
        const merged = { ...draft, ...result.stateModifiers };
        const trueEmotion = mainResolveEmotion(merged);
        const displayed = applyOverride(trueEmotion, currentOverride);
        return {
          ...merged,
          emotion: displayed,
        };
      });
    }
    if (result.action) {
      const wins = BrowserWindow.getAllWindows();
      if (wins.length > 0) {
        if (result.action.type === 'dialog') {
          sendDialog(wins[0]!, result.action.payload);
        } else if (result.action.type === 'emotion' || result.action.type === 'expression') {
          sendAutonomousAction(wins[0]!, result.action);
        }
      }
    }
  }, 10_000);

  // 9c. Discomfort check (every 60 seconds)
  setInterval(() => {
    const state = stateManager.getState();
    const result = checkDiscomfort(state, discomfortState);
    if (Object.keys(result.stateModifiers).length > 0) {
      discomfortState = result.newDiscomfortState;
      stateManager.modify((draft) => {
        const merged = { ...draft, ...result.stateModifiers };
        const trueEmotion = mainResolveEmotion(merged);
        const displayed = applyOverride(trueEmotion, currentOverride);
        return {
          ...merged,
          emotion: displayed,
        };
      });
    }

    // Notify about discomfort if >= 1
    if (result.stateModifiers.discomfortCount && result.stateModifiers.discomfortCount >= 1) {
      const wins = BrowserWindow.getAllWindows();
      if (wins.length > 0) {
        sendDialog(wins[0]!, '...');
      }
    }
  }, 60_000);

  // 9d. Thought Cycle
  thoughtCycle.start(stateManager.getState(), {
    onThink: (thought) => {
      console.log('[Thought]', thought.text);
    },
    onAction: (action) => {
      const wins = BrowserWindow.getAllWindows();
      if (wins.length > 0) {
        const win = wins[0]!;
        if (action.type === 'dialog') {
          sendDialog(win, action.payload);
        } else if (action.type === 'animation') {
          sendAutonomousAction(win, action);
        } else if (action.type === 'expression') {
          sendAutonomousAction(win, action);
        }
      }
    },
  });

  // Store references for reinitialization on activate
  services = { stateManager, memoryStore, autoSave, sessionTracker, systemPoller, onlineNeeds, cooldowns, thoughtCycle, ignoreState, discomfortState, currentOverride, displayEmotion };

  // 10. Register IPC channels (with cooldown + interaction effects + ignore reset)
  registerIpc({
    getState: () => stateManager.getState(),
    onAction: (event) => {
      // Reset ignore state on any user interaction
      ignoreState = resetIgnoreState();
      discomfortState = createDiscomfortState();

      // Cooldown check
      if (!cooldowns.canExecute(event.type)) {
        console.log(`[Cooldown] ${event.type} ignored (on cooldown)`);
        return;
      }
      cooldowns.record(event.type);
      sessionTracker.onUserActivity();

      // Handle clean interaction — reset discomfort
      if (event.type === 'clean') {
        stateManager.modify((draft) => ({
          ...draft,
          discomfortCount: 0,
          lastSeen: Date.now(),
        }));
      }

      // Apply interaction effects
      const state = stateManager.getState();
      const velocity = event.velocity
        ? Math.sqrt(event.velocity.x ** 2 + event.velocity.y ** 2)
        : undefined;
      const delta = applyInteraction(state, event.type, { velocity });

      if (Object.keys(delta).length > 0) {
        stateManager.modify((draft) => {
          const merged = { ...draft, ...delta, lastSeen: Date.now() };
          const trueEmotion = mainResolveEmotion(merged);
          const evaluatedOverride = evaluateOverride(merged);
          const displayed = applyOverride(trueEmotion, evaluatedOverride);
          currentOverride = evaluatedOverride;
          displayEmotion = displayed;
          return {
            ...merged,
            emotion: displayed,
          };
        });
      } else {
        stateManager.applyInteraction(event);
      }
    },
    sendSystemMetrics: (wc, metrics) => {
      wc.send('system:metrics', metrics);
    },
  });

  // 11. Create window
  createWindow(stateManager);

  // 12. Graceful shutdown handlers
  app.on('before-quit', () => {
    autoSave.saveNow();
    memoryStore.save();
  });

  app.on('will-quit', () => {
    if (needsInterval) clearInterval(needsInterval);
    if (ignoreCheckInterval) clearInterval(ignoreCheckInterval);
    thoughtCycle.stop();
    autoSave.stop();
    sessionTracker.stop();
    systemPoller.stop();
  });

  app.on('activate', handleActivate);
};

app.on('window-all-closed', handleWindowAllClosed);

void bootstrap();
