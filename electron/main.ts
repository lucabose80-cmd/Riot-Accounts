import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let currentAccountsData: { own: any[], shared: any[] } = { own: [], shared: [] };

// Auto-Login PowerShell Logic
const performAutoLogin = (username: string, password: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    // Escape for PowerShell string literal AND for SendKeys
    const escapeSendKeys = (str: string) => {
      // SendKeys special chars: + ^ % ~ ( ) [ ] { }
      // We wrap them in braces.
      const sendKeysEscaped = str.replace(/([+^%~()[\]{}])/g, '{$1}');
      // Escape single quotes for PowerShell
      return sendKeysEscaped.replace(/'/g, "''");
    };

    const escapedUser = escapeSendKeys(username);
    const escapedPass = escapeSendKeys(password);
    
    const psScript = `
      Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        public class Win32 {
          [DllImport("user32.dll")]
          [return: MarshalAs(UnmanagedType.Bool)]
          public static extern bool SetForegroundWindow(IntPtr hWnd);
          [DllImport("user32.dll")]
          public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        }
"@
      
      $riotProcess = Get-Process | Where-Object { $_.MainWindowTitle -match "Riot Client" -or $_.Name -match "RiotClientUx" } | Select-Object -First 1
      if (!$riotProcess) {
        Write-Output "ERROR: Riot Client is not running."
        exit 1
      }
      
      $hwnd = $riotProcess.MainWindowHandle
      if ($hwnd -eq 0) {
        Write-Output "ERROR: Riot Client window not found."
        exit 1
      }
      
      [Win32]::ShowWindow($hwnd, 9) | Out-Null
      [Win32]::SetForegroundWindow($hwnd) | Out-Null
      
      Start-Sleep -Milliseconds 500
      
      $wshell = New-Object -ComObject wscript.shell
      $wshell.SendKeys('${escapedUser}')
      Start-Sleep -Milliseconds 100
      $wshell.SendKeys('{TAB}')
      Start-Sleep -Milliseconds 100
      $wshell.SendKeys('${escapedPass}')
      Start-Sleep -Milliseconds 100
      $wshell.SendKeys('{ENTER}')
      
      Write-Output "SUCCESS"
    `;

    const buffer = Buffer.from(psScript, 'utf16le');
    const base64Script = buffer.toString('base64');

    exec(`powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${base64Script}`, (error, stdout, stderr) => {
      if (error || stdout.includes("ERROR")) {
        reject(new Error(stdout || stderr || error?.message));
      } else {
        resolve(true);
      }
    });
  });
};

// Deep linking protocol: riot-app://
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('riot-app', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('riot-app');
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      // Look for the deep link
      const url = commandLine.find(arg => arg.startsWith('riot-app://'));
      if (url) {
        mainWindow.webContents.send('deep-link', url);
      }
    }
  });

  app.whenReady().then(() => {
    // Silent Autostart Setup
    const isHidden = process.argv.includes('--hidden');
    app.setLoginItemSettings({
      openAtLogin: true,
      args: ['--hidden']
    });

    createWindow(isHidden);
    createOverlayWindow();
    startRiotWatcher();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow(false);
      }
    });
  });
}

function createWindow(isHidden: boolean = false) {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Riot Accounts',
    show: !isHidden,
    autoHideMenuBar: true, // Hide menu bar
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#141218',
      symbolColor: '#ffffff',
      height: 32
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.setMenuBarVisibility(false); // Extra measure to hide menu bar

  // Minimize to tray instead of quitting
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // Handle auto-login IPC
  ipcMain.handle('auto-login', async (event, username, password) => {
    return performAutoLogin(username, password);
  });

  // Setup Tray
  const createTray = () => {
    if (tray) return;
    
    const iconPath = path.join(__dirname, '../public/icon.png');
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon.resize({ width: 16, height: 16 }));
    tray.setToolTip('Riot Accounts');
    
    updateTrayMenu({ own: [], shared: [] }); // initial empty menu
    
    tray.on('double-click', () => {
      mainWindow?.show();
    });
  };

  const updateTrayMenu = (data: { own: any[], shared: any[] }) => {
    if (!tray) return;

    const template: Electron.MenuItemConstructorOptions[] = [
      { label: 'Riot Accounts Öffnen', click: () => mainWindow?.show() },
      { type: 'separator' }
    ];

    if (data.own.length > 0 || data.shared.length > 0) {
      if (data.own.length > 0) {
        template.push({ label: 'Meine Accounts:', enabled: false });
        data.own.forEach(acc => {
          template.push({
            label: `   🚀 ${acc.name}`,
            click: () => performAutoLogin(acc.loginName, acc.password).catch(e => console.error(e))
          });
        });
        template.push({ type: 'separator' });
      }

      if (data.shared.length > 0) {
        template.push({ label: 'Geteilte Accounts:', enabled: false });
        data.shared.forEach(acc => {
          template.push({
            label: `   🚀 ${acc.name}`,
            click: () => performAutoLogin(acc.loginName, acc.password).catch(e => console.error(e))
          });
        });
        template.push({ type: 'separator' });
      }
    } else {
      template.push({ label: 'Keine Accounts gefunden', enabled: false });
      template.push({ type: 'separator' });
    }

    template.push({
      label: 'Windows Autostart',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => {
        app.setLoginItemSettings({
          openAtLogin: item.checked,
          path: app.getPath('exe'),
          args: [
            '--processStart', `"${app.name}"`,
            '--process-start-args', `"--hidden"`
          ]
        });
      }
    });
    template.push({ type: 'separator' });

    template.push({
      label: 'Beenden',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    });

    const contextMenu = Menu.buildFromTemplate(template);
    tray.setContextMenu(contextMenu);
  };

  ipcMain.on('update-tray-accounts', (event, accounts) => {
    currentAccountsData = accounts;
    updateTrayMenu(accounts);
    if (overlayWindow) {
      overlayWindow.webContents.send('update-accounts', accounts);
    }
  });

  createTray();

  // In production, we load the built index.html. In dev, we load localhost.
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // Parse deep link if opened directly in dev
    const url = process.argv.find(arg => arg.startsWith('riot-app://'));
    if (url) {
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow?.webContents.send('deep-link', url);
      });
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    
    // Parse deep link if opened directly in prod
    const url = process.argv.find(arg => arg.startsWith('riot-app://'));
    if (url) {
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow?.webContents.send('deep-link', url);
      });
    }
  }
}

function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    width: 320,
    height: 480,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    overlayWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}#/overlay`);
  } else {
    overlayWindow.loadURL(`file://${path.join(__dirname, '../dist/index.html')}#/overlay`);
  }

  overlayWindow.on('blur', () => {
    overlayWindow?.hide();
  });
}

function startRiotWatcher() {
  const psScript = `
    Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      using System.Text;

      [StructLayout(LayoutKind.Sequential)]
      public struct RECT
      {
          public int Left;
          public int Top;
          public int Right;
          public int Bottom;
      }

      public class Win32 {
        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();
        [DllImport("user32.dll")]
        public static extern int GetWindowThreadProcessId(IntPtr hWnd, out int lpdwProcessId);
        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
        [DllImport("user32.dll")]
        public static extern bool GetWindowRect(IntPtr hwnd, out RECT lpRect);
      }
"@
    while($true) {
      $hwnd = [Win32]::GetForegroundWindow()
      $title = New-Object System.Text.StringBuilder 256
      [Win32]::GetWindowText($hwnd, $title, 256) | Out-Null
      $windowTitle = $title.ToString()

      $pid = 0
      [Win32]::GetWindowThreadProcessId($hwnd, [ref]$pid) | Out-Null
      $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
      
      if ($windowTitle -match "Riot Client" -or ($process -and $process.Name -match "RiotClientUx")) {
        $rect = New-Object RECT
        [Win32]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
        $width = $rect.Right - $rect.Left
        $height = $rect.Bottom - $rect.Top
        Write-Output "RIOT_ACTIVE|$($rect.Left)|$($rect.Top)|$width|$height"
      } else {
        Write-Output "RIOT_INACTIVE"
      }
      Start-Sleep -Milliseconds 1000
    }
  `;

  const buffer = Buffer.from(psScript, 'utf16le');
  const base64Script = buffer.toString('base64');

  const watcher = require('child_process').spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', base64Script]);
  
  let wasActive = false;
  watcher.stdout.on('data', (data: any) => {
    const lines = data.toString().trim().split('\n');
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      
      if (line.startsWith('RIOT_ACTIVE')) {
        const parts = line.split('|');
        if (parts.length === 5 && overlayWindow && !overlayWindow.isDestroyed()) {
          const x = parseInt(parts[1], 10);
          const y = parseInt(parts[2], 10);
          const width = parseInt(parts[3], 10);
          const height = parseInt(parts[4], 10);

          // Position overlay directly to the right of Riot Client with same height
          const overlayWidth = 340;
          overlayWindow.setBounds({
            x: x + width + 10, // 10px padding
            y: y,
            width: overlayWidth,
            height: height
          });

          if (!wasActive && !overlayWindow.isVisible()) {
            overlayWindow.showInactive();
            overlayWindow.webContents.send('update-accounts', currentAccountsData);
          }
        }
        wasActive = true;
      } else if (line.includes('RIOT_INACTIVE')) {
        if (wasActive && overlayWindow && !overlayWindow.isFocused()) {
          overlayWindow.hide();
        }
        wasActive = false;
      }
    }
  });

  app.on('will-quit', () => {
    watcher.kill();
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
