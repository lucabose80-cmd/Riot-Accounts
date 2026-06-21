import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  autoLogin: (loginName: string, password: string) => ipcRenderer.invoke('auto-login', loginName, password),
  updateTray: (accounts: any[]) => ipcRenderer.send('update-tray-accounts', accounts),
  onDeepLink: (callback: (url: string) => void) => {
    ipcRenderer.on('deep-link', (_event, url) => callback(url));
  }
});
