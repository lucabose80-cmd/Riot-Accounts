import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Divider, GlobalStyles, CardActionArea, Avatar, AvatarGroup } from '@mui/material';
import { Rocket } from 'lucide-react';
import { useElectron } from '../hooks/useElectron';
import { fetchLoLChampions, fetchValorantAgents } from '../services/api';
import type { Champion, Agent } from '../services/api';

export const OverlayView: React.FC = () => {
  const { autoLogin } = useElectron();
  const [accountsData, setAccountsData] = useState<{ own: any[], shared: any[] }>({ own: [], shared: [] });
  const [champions, setChampions] = useState<Champion[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    fetchLoLChampions().then(setChampions).catch(console.error);
    fetchValorantAgents().then(setAgents).catch(console.error);

    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.onUpdateAccounts((accounts: any) => {
        setAccountsData(accounts);
      });
    }
  }, []);

  const totalAccounts = accountsData.own.length + accountsData.shared.length;

  return (
    <>
      <GlobalStyles styles={{ 
        'html, body, #root': { 
          backgroundColor: 'transparent !important', 
          margin: 0, 
          padding: 0, 
          overflow: 'hidden' 
        } 
      }} />
      <Box sx={{ p: 1.5, height: '100vh', width: '100vw', boxSizing: 'border-box', overflow: 'hidden' }}>
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
                    <CardActionArea 
                      key={acc.id || acc.loginName}
                      onClick={() => autoLogin(acc.loginName, acc.password)}
                      sx={{ 
                        p: 1.5, 
                        mb: 1, 
                        borderRadius: 2, 
                        border: '1px solid rgba(255,255,255,0.05)',
                        bgcolor: 'rgba(255,255,255,0.02)',
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' }
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Rocket size={14} color="#a9a9a9" /> {acc.name}
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="caption" sx={{ color: '#c8aa6e', fontWeight: 'bold', fontSize: '0.7rem', display: 'block' }}>LEAGUE OF LEGENDS</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              Lvl {acc.lol?.level || '?'} • {acc.lol?.rank || 'Unranked'}
                            </Typography>
                          </Box>
                          <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 20, height: 20, fontSize: 10, borderColor: 'rgba(255,255,255,0.1)' } }}>
                            {acc.lol?.champions?.slice(0, 4).map((id: string) => {
                              const c = champions.find(ch => ch.id === id);
                              return c ? <Avatar key={id} src={c.imageUrl} alt={c.name} /> : null;
                            })}
                          </AvatarGroup>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="caption" sx={{ color: '#ff4655', fontWeight: 'bold', fontSize: '0.7rem', display: 'block' }}>VALORANT</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              Lvl {acc.valorant?.level || '?'} • {acc.valorant?.rank || 'Unranked'}
                            </Typography>
                          </Box>
                          <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 20, height: 20, fontSize: 10, borderColor: 'rgba(255,255,255,0.1)' } }}>
                            {acc.valorant?.characters?.slice(0, 4).map((id: string) => {
                              const a = agents.find(ag => ag.uuid === id);
                              return a ? <Avatar key={id} src={a.displayIcon} alt={a.displayName} /> : null;
                            })}
                          </AvatarGroup>
                        </Box>
                      </Box>
                    </CardActionArea>
                  ))}
                </Box>
              )}
              
              {accountsData.own.length > 0 && accountsData.shared.length > 0 && <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.1)' }} />}
              
              {accountsData.shared.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1, mb: 1, display: 'block' }}>GETEILTE ACCOUNTS</Typography>
                  {accountsData.shared.map(acc => (
                    <CardActionArea 
                      key={acc.id || acc.loginName}
                      onClick={() => autoLogin(acc.loginName, acc.password)}
                      sx={{ 
                        p: 1.5, 
                        mb: 1, 
                        borderRadius: 2, 
                        border: '1px solid rgba(255,255,255,0.05)',
                        bgcolor: 'rgba(255,255,255,0.02)',
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' }
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Rocket size={14} color="#a9a9a9" /> {acc.name}
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="caption" sx={{ color: '#c8aa6e', fontWeight: 'bold', fontSize: '0.7rem', display: 'block' }}>LEAGUE OF LEGENDS</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              Lvl {acc.lol?.level || '?'} • {acc.lol?.rank || 'Unranked'}
                            </Typography>
                          </Box>
                          <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 20, height: 20, fontSize: 10, borderColor: 'rgba(255,255,255,0.1)' } }}>
                            {acc.lol?.champions?.slice(0, 4).map((id: string) => {
                              const c = champions.find(ch => ch.id === id);
                              return c ? <Avatar key={id} src={c.imageUrl} alt={c.name} /> : null;
                            })}
                          </AvatarGroup>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="caption" sx={{ color: '#ff4655', fontWeight: 'bold', fontSize: '0.7rem', display: 'block' }}>VALORANT</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              Lvl {acc.valorant?.level || '?'} • {acc.valorant?.rank || 'Unranked'}
                            </Typography>
                          </Box>
                          <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 20, height: 20, fontSize: 10, borderColor: 'rgba(255,255,255,0.1)' } }}>
                            {acc.valorant?.characters?.slice(0, 4).map((id: string) => {
                              const a = agents.find(ag => ag.uuid === id);
                              return a ? <Avatar key={id} src={a.displayIcon} alt={a.displayName} /> : null;
                            })}
                          </AvatarGroup>
                        </Box>
                      </Box>
                    </CardActionArea>
                  ))}
                </Box>
              )}
            </>
          )}
        </Box>
      </Paper>
    </Box>
    </>
  );
};
