export interface ElectronAPI {
  autoLogin: (loginName: string, password: string) => Promise<boolean>;
  onDeepLink: (callback: (url: string) => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
