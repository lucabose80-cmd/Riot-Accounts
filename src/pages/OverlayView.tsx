import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, Divider } from '@mui/material';
import { Rocket } from 'lucide-react';
import { useElectron } from '../hooks/useElectron';

export const OverlayView: React.FC = () => {
  const { autoLogin } = useElectron();
  const [accountsData, setAccountsData] = useState<{ own: any[], shared: any[] }>({ own: [], shared: [] });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.onUpdateAccounts((accounts: any) => {
        setAccountsData(accounts);
      });
    }
  }, []);

  const totalAccounts = accountsData.own.length + accountsData.shared.length;

  return (
    <Box sx={{ p: 2, height: '100vh', width: '100vw', boxSizing: 'border-box', overflow: 'hidden', bgcolor: 'transparent' }}>
      <Paper 
        elevation={6} 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          bgcolor: 'rgba(20, 18, 24, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)', WebkitAppRegion: 'drag' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
            Riot Auto-Login
          </Typography>
        </Box>
        
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
          {totalAccounts === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
              Keine Accounts verfügbar.
            </Typography>
          ) : (
            <>
              {accountsData.own.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1, mb: 1, display: 'block' }}>MEINE ACCOUNTS</Typography>
                  {accountsData.own.map(acc => (
                    <Button 
                      key={acc.id || acc.loginName}
                      fullWidth 
                      variant="text" 
                      startIcon={<Rocket size={16} />}
                      sx={{ justifyContent: 'flex-start', mb: 0.5, color: 'text.primary', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                      onClick={() => autoLogin(acc.loginName, acc.password)}
                    >
                      {acc.name}
                    </Button>
                  ))}
                </Box>
              )}
              
              {accountsData.own.length > 0 && accountsData.shared.length > 0 && <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.1)' }} />}
              
              {accountsData.shared.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1, mb: 1, display: 'block' }}>GETEILTE ACCOUNTS</Typography>
                  {accountsData.shared.map(acc => (
                    <Button 
                      key={acc.id || acc.loginName}
                      fullWidth 
                      variant="text" 
                      startIcon={<Rocket size={16} />}
                      sx={{ justifyContent: 'flex-start', mb: 0.5, color: 'text.primary', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                      onClick={() => autoLogin(acc.loginName, acc.password)}
                    >
                      {acc.name}
                    </Button>
                  ))}
                </Box>
              )}
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
};
