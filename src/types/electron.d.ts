export interface ElectronAPI {
  autoLogin: (loginName: string, password: string) => Promise<boolean>;
  updateTray: (accounts: any) => void;
  onDeepLink: (callback: (url: string) => void) => void;
  onUpdateAccounts: (callback: (accounts: any) => void) => void;
  expandOverlay: () => void;
  shrinkOverlay: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
