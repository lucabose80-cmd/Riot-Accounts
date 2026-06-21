import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useElectron = () => {
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;
  const navigate = useNavigate();

  useEffect(() => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.onDeepLink((url: string) => {
        try {
          const parsedUrl = new URL(url);
          // riot-app://share/7hvaj5f
          if (parsedUrl.hostname === 'share' || parsedUrl.pathname.includes('share')) {
            const shareId = parsedUrl.pathname.split('/').pop() || parsedUrl.hostname;
            if (shareId) {
              navigate(`/share/${shareId}`);
            }
          }
        } catch (e) {
          console.error("Failed to parse deep link", e);
        }
      });
    }
  }, [isElectron, navigate]);

  const autoLogin = async (loginName?: string, password?: string) => {
    if (!isElectron || !window.electronAPI) {
      alert('Auto-Login ist nur in der Desktop-App verfügbar!');
      return;
    }
    if (!loginName || !password) {
      alert('Login-Name oder Passwort fehlen!');
      return;
    }
    
    try {
      await window.electronAPI.autoLogin(loginName, password);
    } catch (e: any) {
      alert(`Auto-Login fehlgeschlagen: ${e.message}`);
    }
  };

  return { isElectron, autoLogin };
};
