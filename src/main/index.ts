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


interface AppServices {
  stateManager: StateManager;
  memoryStore: MemoryStore;
  autoSave: AutoSaveController;
  sessionTracker: SessionTracker;
  systemPoller: SystemPoller;
}

let services: AppServices | null = null;


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

  // Store references for reinitialization on activate
  services = { stateManager, memoryStore, autoSave, sessionTracker, systemPoller };

  // 9. Register IPC channels
  registerIpc({
    getState: () => stateManager.getState(),
    onAction: (event) => {
      stateManager.applyInteraction(event);
      sessionTracker.onUserActivity();
    },
    sendSystemMetrics: (wc, metrics) => {
      wc.send('system:metrics', metrics);
    },
  });

  // 10. Create window
  createWindow(stateManager);

  // 11. Graceful shutdown handlers
  app.on('before-quit', () => {
    autoSave.saveNow();
    memoryStore.save();
  });

  app.on('will-quit', () => {
    autoSave.stop();
    sessionTracker.stop();
    systemPoller.stop();
  });

  app.on('activate', handleActivate);
};

app.on('window-all-closed', handleWindowAllClosed);

void bootstrap();
