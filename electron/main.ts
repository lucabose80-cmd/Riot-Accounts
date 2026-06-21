import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// Auto-Login PowerShell Logic
const performAutoLogin = (username: string, password: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const escapedUser = username.replace(/'/g, "''");
    const escapedPass = password.replace(/'/g, "''").replace(/"/g, '`"');
    
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
      
      $riotProcess = Get-Process -Name "RiotClientUx" -ErrorAction SilentlyContinue
      if (!$riotProcess) {
        Write-Output "ERROR: Riot Client is not running."
        exit 1
      }
      
      $hwnd = $riotProcess[0].MainWindowHandle
      if ($hwnd -eq 0) {
        Write-Output "ERROR: Riot Client window not found."
        exit 1
      }
      
      [Win32]::ShowWindow($hwnd, 9) | Out-Null # Restore if minimized
      [Win32]::SetForegroundWindow($hwnd) | Out-Null
      
      Start-Sleep -Milliseconds 500
      
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait('${escapedUser}')
      Start-Sleep -Milliseconds 100
      [System.Windows.Forms.SendKeys]::SendWait('{TAB}')
      Start-Sleep -Milliseconds 100
      [System.Windows.Forms.SendKeys]::SendWait('${escapedPass}')
      Start-Sleep -Milliseconds 100
      [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
      
      Write-Output "SUCCESS"
    `;

    exec(`powershell.exe -NoProfile -Command "${psScript.replace(/\n/g, ';')}"`, (error, stdout, stderr) => {
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
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Riot Accounts',
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
    
    updateTrayMenu([]); // initial empty menu
    
    tray.on('double-click', () => {
      mainWindow?.show();
    });
  };

  const updateTrayMenu = (accounts: any[]) => {
    if (!tray) return;

    const template: Electron.MenuItemConstructorOptions[] = [
      { label: 'Riot Accounts Öffnen', click: () => mainWindow?.show() },
      { type: 'separator' }
    ];

    if (accounts.length > 0) {
      template.push({ label: '🚀 Auto-Login:', enabled: false });
      accounts.forEach(acc => {
        template.push({
          label: `   ${acc.name}`,
          click: () => performAutoLogin(acc.loginName, acc.password).catch(e => console.error(e))
        });
      });
      template.push({ type: 'separator' });
    } else {
      template.push({ label: 'Keine Accounts gefunden', enabled: false });
      template.push({ type: 'separator' });
    }

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
    updateTrayMenu(accounts);
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
