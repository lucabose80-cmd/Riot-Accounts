import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  autoLogin: (loginName: string, password: string) => ipcRenderer.invoke('auto-login', loginName, password),
  updateTray: (accounts: any[]) => ipcRenderer.send('update-tray-accounts', accounts),
  onDeepLink: (callback: (url: string) => void) => {
    ipcRenderer.on('deep-link', (_event, url) => callback(url));
  },
  onUpdateAccounts: (callback: (accounts: any) => void) => {
    ipcRenderer.on('update-accounts', (_event, accounts) => callback(accounts));
  },
  expandOverlay: () => ipcRenderer.send('expand-overlay'),
  shrinkOverlay: () => ipcRenderer.send('shrink-overlay')
});
