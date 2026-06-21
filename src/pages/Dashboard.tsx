import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppTheme } from '../contexts/ThemeContext';
import { useElectron } from '../hooks/useElectron';
import { getUserAccounts, deleteAccount, createSharedLink, updateAccount, getSavedSharedLinks, getSharedAccounts } from '../services/db';
import { getRankIcon, LOL_RANKS, VALORANT_RANKS, TFT_RANKS } from '../types';
import type { RiotAccount, HistoryEntry } from '../types';
import { auth } from '../firebase';
import { fetchLoLChampions, fetchValorantAgents, fetchValorantRanksMap } from '../services/api';
import type { Champion, Agent } from '../services/api';
import { CharacterSelector } from '../components/CharacterSelector';
import { generateHistoryDiff } from '../utils/history';
import { 
  Container, Typography, Button, Box, IconButton, Tooltip, CircularProgress, AppBar, Toolbar, Checkbox,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Menu, MenuItem, Card, CardContent, CardActions
} from '@mui/material';
import { Plus, LogOut, Share2, Trash2, History, Minus, Settings, Copy, Eye, EyeOff, Palette, Rocket, Link } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { setTheme } = useAppTheme();
  const { isElectron, autoLogin, updateTray } = useElectron();
  const navigate = useNavigate();
  
  const [accounts, setAccounts] = useState<RiotAccount[]>([]);
  const [savedShares, setSavedShares] = useState<string[]>([]);
  const [originalAccounts, setOriginalAccounts] = useState<Record<string, RiotAccount>>({});
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  
  const [champions, setChampions] = useState<Champion[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [valoRankMap, setValoRankMap] = useState<Record<string, string>>({});

  const [historyModal, setHistoryModal] = useState<HistoryEntry[] | null>(null);
  const [editCharactersModal, setEditCharactersModal] = useState<{ accountId: string, game: 'lol' | 'valorant' } | null>(null);
  const [themeAnchorEl, setThemeAnchorEl] = useState<null | HTMLElement>(null);

  const fetchAccounts = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await getUserAccounts(currentUser.uid);
      const preparedAccs = data.map(a => ({ ...a, tft: a.tft || { rank: 'Unranked' } }));
      setAccounts(preparedAccs);
      
      const orig: Record<string, RiotAccount> = {};
      preparedAccs.forEach(a => orig[a.id!] = JSON.parse(JSON.stringify(a)));
      setOriginalAccounts(orig);

      const shares = await getSavedSharedLinks(currentUser.uid);
      setSavedShares(shares);

      // Collect all accounts for Tray Auto-Login
      const allTrayAccounts: any[] = [];
      data.forEach(a => {
        if (a.loginName && a.password) {
          allTrayAccounts.push({ name: a.ingameName, loginName: a.loginName, password: a.password });
        }
      });
      // Try to load shared accounts too for Tray menu
      for (const shareId of shares) {
        try {
          const sAccs = await getSharedAccounts(shareId);
          sAccs.forEach(a => {
            if (a.loginName && a.password) {
              allTrayAccounts.push({ name: a.ingameName, loginName: a.loginName, password: a.password });
            }
          });
        } catch(e) {}
      }
      updateTray(allTrayAccounts);
    } catch (error) {
      console.error("Failed to fetch accounts", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadGlobals = async () => {
      try {
        const [champs, agts, vRanks] = await Promise.all([
          fetchLoLChampions(),
          fetchValorantAgents(),
          fetchValorantRanksMap()
        ]);
        setChampions(champs);
        setAgents(agts);
        setValoRankMap(vRanks);
      } catch (err) {
        console.error("Failed to fetch globals", err);
      }
    };
    loadGlobals();
    fetchAccounts();
  }, [currentUser]);

  const handleLogout = () => {
    auth.signOut();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Möchtest du diesen Account wirklich löschen?')) {
      await deleteAccount(id);
      fetchAccounts();
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedAccounts.includes(id)) {
      setSelectedAccounts(selectedAccounts.filter(x => x !== id));
    } else {
      setSelectedAccounts([...selectedAccounts, id]);
    }
  };

  const handleShareSelected = async () => {
    if (selectedAccounts.length === 0) return;
    try {
      const shareId = await createSharedLink(selectedAccounts);
      const url = `${window.location.origin}/share/${shareId}`;
      navigator.clipboard.writeText(url);
      alert('Share-Link für ausgewählte Accounts wurde in die Zwischenablage kopiert!');
      setSelectedAccounts([]);
      fetchAccounts(); // Refresh to show newly saved share
    } catch (err) {
      console.error(err);
      alert('Fehler beim Erstellen des Share-Links.');
    }
  };

  const handleUpdateAccount = async (account: RiotAccount) => {
    if (!account.id) return;
    setSaving(account.id);

    try {
      const oldAcc = originalAccounts[account.id];
      const diffs = generateHistoryDiff(oldAcc, account);
      
      let actionMsg = 'Account bearbeitet (Besitzer)';
      if (diffs.length > 0) {
        actionMsg = diffs.join(', ');
      }

      const historyEntry: HistoryEntry = {
        timestamp: Date.now(),
        user: 'Besitzer',
        action: actionMsg
      };
      
      const updatedHistory = [...(account.history || []), historyEntry];

      await updateAccount(account.id, {
        lol: account.lol,
        valorant: account.valorant,
        tft: account.tft,
        history: updatedHistory
      });
      
      setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, history: updatedHistory } : a));
      setOriginalAccounts(prev => ({ ...prev, [account.id!]: JSON.parse(JSON.stringify({ ...account, history: updatedHistory })) }));
    } catch (err: any) {
      console.error(`Fehler bei ${account.ingameName}: `, err);
      alert("Fehler beim Speichern!");
    } finally {
      setSaving(null);
    }
  };

  const handleChange = (accountId: string, field: string, value: any) => {
    setAccounts(prev => prev.map(acc => {
      if (acc.id !== accountId) return acc;
      const parts = field.split('.');
      if (parts[0] === 'lol') return { ...acc, lol: { ...acc.lol, [parts[1]]: value } };
      if (parts[0] === 'valorant') return { ...acc, valorant: { ...acc.valorant, [parts[1]]: value } };
      if (parts[0] === 'tft') return { ...acc, tft: { ...acc.tft!, [parts[1]]: value } };
      return acc;
    }));
  };

  const formattedChampions = champions.map(c => ({
    id: c.id, name: c.name, imageUrl: c.imageUrl || '', roles: c.tags
  }));

  const formattedAgents = agents.map(a => ({
    id: a.uuid, name: a.displayName, imageUrl: a.displayIcon, roles: a.role ? [a.role.displayName] : ['Unbekannt']
  }));

  const renderRankIcon = (game: 'lol' | 'valorant' | 'tft', rank: string) => {
    let url = null;
    let size = 40; 
    if (game === 'valorant') {
      url = valoRankMap[rank] || null;
      size = 32;
    } else {
      url = getRankIcon(rank, game);
    }
    if (!url) return null;
    return <img src={url} alt={rank} style={{ width: size, height: size, objectFit: 'contain', marginRight: 8 }} />;
  };

  const LevelInput = ({ value, onChange }: { value: number, onChange: (v: number) => void }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.5, height: 32 }}>
      <IconButton size="small" onClick={() => onChange(Math.max(1, value - 1))}><Minus size={14} /></IconButton>
      <Typography variant="body2" sx={{ width: 30, textAlign: 'center', fontWeight: 'bold' }}>{value}</Typography>
      <IconButton size="small" onClick={() => onChange(value + 1)}><Plus size={14} /></IconButton>
    </Box>
  );

  const RankInput = ({ value, options, onChange }: { value: string, options: string[], onChange: (v: string) => void }) => {
    const currentIndex = options.indexOf(value);
    const handlePrev = () => {
      if (currentIndex > 0) onChange(options[currentIndex - 1]);
    };
    const handleNext = () => {
      if (currentIndex < options.length - 1 && currentIndex !== -1) onChange(options[currentIndex + 1]);
      else if (currentIndex === -1) onChange(options[0]);
    };
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.5, height: 32 }}>
        <IconButton size="small" onClick={handlePrev} disabled={currentIndex <= 0}><Minus size={14} /></IconButton>
        <Typography variant="body2" sx={{ minWidth: 90, textAlign: 'center', fontWeight: 'bold' }}>{value}</Typography>
        <IconButton size="small" onClick={handleNext} disabled={currentIndex >= options.length - 1}><Plus size={14} /></IconButton>
      </Box>
    );
  };

  const renderCharacters = (ids: string[], game: 'lol' | 'valorant', onClick: () => void) => {
    const maxChars = game === 'lol' ? champions.length : agents.length;
    
    if (ids.length >= maxChars && maxChars > 0) {
      return (
        <Tooltip title="Klicken zum Bearbeiten">
          <Box onClick={onClick} sx={{ cursor: 'pointer', display: 'inline-flex', mt: 1, alignItems: 'center', bgcolor: 'warning.light', color: 'warning.contrastText', px: 1, py: 0.5, borderRadius: 2, fontSize: '0.75rem', fontWeight: 'bold' }}>
            🌟 Alle freigeschaltet ({ids.length})
          </Box>
        </Tooltip>
      );
    }

    if (!ids || ids.length === 0) {
      return (
        <Tooltip title="Klicken zum Bearbeiten">
          <Button size="small" onClick={onClick} variant="outlined" sx={{ mt: 1, fontSize: '0.7rem' }}>Charaktere hinzufügen</Button>
        </Tooltip>
      );
    }

    const itemsData = ids.map(id => {
      if (game === 'lol') {
        const c = champions.find(c => c.id === id);
        return { id, img: c?.imageUrl || '', name: c?.name || id };
      } else {
        const a = agents.find(a => a.uuid === id);
        return { id, img: a?.displayIcon || '', name: a?.displayName || id };
      }
    });

    itemsData.sort((a, b) => a.name.localeCompare(b.name));
    const displayItems = itemsData.slice(0, 8);
    const hasMore = itemsData.length > 8;

    return (
      <Tooltip title="Klicken zum Bearbeiten">
        <Box onClick={onClick} sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1, cursor: 'pointer', '&:hover': { opacity: 0.8 } }}>
          {displayItems.map(item => (
            <Box key={item.id} component="img" src={item.img} alt={item.name} sx={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid', borderColor: 'divider' }} />
          ))}
          {hasMore && (
            <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'action.selected', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="caption">+{itemsData.length - 8}</Typography>
            </Box>
          )}
        </Box>
      </Tooltip>
    );
  };

  const CredentialField = ({ label, value, isPassword = false }: { label: string, value: string, isPassword?: boolean }) => {
    const [show, setShow] = useState(false);
    const handleCopy = () => {
      navigator.clipboard.writeText(value);
      alert(`${label} in die Zwischenablage kopiert!`);
    };
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ width: 45 }}>{label}:</Typography>
        <Typography variant="body2" sx={{ fontFamily: isPassword && !show ? 'inherit' : 'monospace', fontWeight: 'bold' }}>
          {isPassword && !show ? '••••••••' : value}
        </Typography>
        <IconButton size="small" onClick={handleCopy} sx={{ p: 0.5 }}><Copy size={14} /></IconButton>
        {isPassword && (
          <IconButton size="small" onClick={() => setShow(!show)} sx={{ p: 0.5 }}>
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </IconButton>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar 
        position="static" 
        color="transparent" 
        elevation={0} 
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider', 
          WebkitAppRegion: 'drag', // Make header draggable
          paddingRight: isElectron ? '140px' : '0px' // Leave space for native window controls
        }}
      >
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Riot Accounts
          </Typography>
          <Box sx={{ WebkitAppRegion: 'no-drag', display: 'flex', gap: 1 }}>
            <IconButton color="inherit" onClick={(e) => setThemeAnchorEl(e.currentTarget)}>
              <Palette size={20} />
            </IconButton>
            <Menu anchorEl={themeAnchorEl} open={Boolean(themeAnchorEl)} onClose={() => setThemeAnchorEl(null)}>
              <MenuItem onClick={() => { setTheme('default'); setThemeAnchorEl(null); }}>Standard Dark</MenuItem>
              <MenuItem onClick={() => { setTheme('hextech'); setThemeAnchorEl(null); }}>Hextech (LoL)</MenuItem>
              <MenuItem onClick={() => { setTheme('valorant'); setThemeAnchorEl(null); }}>Radiant (Valorant)</MenuItem>
            </Menu>
            <Button color="inherit" onClick={handleLogout} startIcon={<LogOut size={18} />}>
              Abmelden
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1">
            Meine Accounts
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {selectedAccounts.length > 0 && (
              <Button variant="outlined" color="primary" startIcon={<Share2 size={20} />} onClick={handleShareSelected}>
                Ausgewählte Teilen ({selectedAccounts.length})
              </Button>
            )}
            <Button variant="contained" startIcon={<Plus size={20} />} onClick={() => navigate('/account/new')}>
              Neuer Account
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
            <CircularProgress />
          </Box>
        ) : accounts.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 10 }}>
            <Typography variant="body1" color="text.secondary">Du hast noch keine Accounts hinzugefügt.</Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={3}>
            <Table sx={{ minWidth: 1000 }}>
              <TableHead sx={{ bgcolor: 'background.default' }}>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedAccounts.length > 0 && selectedAccounts.length < accounts.length}
                      checked={accounts.length > 0 && selectedAccounts.length === accounts.length}
                      onChange={(e) => setSelectedAccounts(e.target.checked ? accounts.map(a => a.id!) : [])}
                    />
                  </TableCell>
                  <TableCell>Account</TableCell>
                  <TableCell>League of Legends</TableCell>
                  <TableCell>Valorant</TableCell>
                  <TableCell>TFT</TableCell>
                  <TableCell align="right">Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accounts.map((account) => {
                  const isDirty = JSON.stringify(account) !== JSON.stringify(originalAccounts[account.id!]);
                  return (
                    <TableRow key={account.id} hover selected={selectedAccounts.includes(account.id!)}>
                      <TableCell padding="checkbox">
                        <Checkbox 
                          checked={selectedAccounts.includes(account.id!)}
                          onChange={() => handleToggleSelect(account.id!)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{account.ingameName}</Typography>
                          <IconButton size="small" onClick={() => { navigator.clipboard.writeText(account.ingameName); alert('Name kopiert!'); }} sx={{ p: 0.5 }}><Copy size={14} /></IconButton>
                          {isElectron && account.loginName && account.password && (
                            <Button size="small" variant="contained" color="secondary" startIcon={<Rocket size={14} />} onClick={() => autoLogin(account.loginName, account.password)}>
                              Auto-Login
                            </Button>
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">Server: {account.server}</Typography>
                        <Box sx={{ mt: 1 }}>
                          <CredentialField label="Login" value={account.loginName || ''} />
                          <CredentialField label="PW" value={account.password || ''} isPassword />
                        </Box>
                        {account.mainRoles && account.mainRoles.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                            {account.mainRoles.map(role => (
                              <Chip key={role} label={role} size="small" color="secondary" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                            ))}
                          </Box>
                        )}
                        {account.notes && (
                          <Typography variant="caption" color="info.main" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                            📝 {account.notes}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                          <LevelInput value={account.lol.level} onChange={(v) => handleChange(account.id!, 'lol.level', v)} />
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {renderRankIcon('lol', account.lol.rank)}
                            <RankInput value={account.lol.rank} options={LOL_RANKS} onChange={(v) => handleChange(account.id!, 'lol.rank', v)} />
                          </Box>
                        </Box>
                        {renderCharacters(account.lol.champions, 'lol', () => setEditCharactersModal({ accountId: account.id!, game: 'lol' }))}
                      </TableCell>

                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                          <LevelInput value={account.valorant.level} onChange={(v) => handleChange(account.id!, 'valorant.level', v)} />
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {renderRankIcon('valorant', account.valorant.rank)}
                            <RankInput value={account.valorant.rank} options={VALORANT_RANKS} onChange={(v) => handleChange(account.id!, 'valorant.rank', v)} />
                          </Box>
                        </Box>
                        {renderCharacters(account.valorant.characters, 'valorant', () => setEditCharactersModal({ accountId: account.id!, game: 'valorant' }))}
                      </TableCell>

                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {renderRankIcon('tft', account.tft?.rank || 'Unranked')}
                          <RankInput value={account.tft?.rank || 'Unranked'} options={TFT_RANKS} onChange={(v) => handleChange(account.id!, 'tft.rank', v)} />
                        </Box>
                      </TableCell>

                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <Button 
                            variant={isDirty ? "contained" : "outlined"} 
                            color={isDirty ? "primary" : "inherit"}
                            size="small" 
                            onClick={() => handleUpdateAccount(account)} 
                            disabled={saving === account.id || !isDirty}
                            sx={{ minWidth: 100 }}
                          >
                            {saving === account.id ? 'Lädt...' : 'Speichern'}
                          </Button>
                          <Tooltip title="Vollständige Account-Details bearbeiten">
                            <IconButton onClick={() => navigate(`/account/${account.id}`)} color="secondary" size="small">
                              <Settings size={18} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Verlauf (Audit Log)">
                            <IconButton onClick={() => setHistoryModal(account.history || [])} color="primary" size="small">
                              <History size={18} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Account löschen">
                            <IconButton onClick={() => account.id && handleDelete(account.id)} color="error" size="small">
                              <Trash2 size={18} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {savedShares.length > 0 && (
          <Box sx={{ mt: 6 }}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
              Gespeicherte Freigaben
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {savedShares.map(shareId => (
                <Card key={shareId} sx={{ minWidth: 275, bgcolor: 'background.paper' }}>
                  <CardContent>
                    <Typography variant="h6" component="div">
                      Freigabe: {shareId}
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>
                      Hier klicken um die Accounts dieses Links zu sehen.
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small" startIcon={<Link size={16} />} onClick={() => navigate(`/share/${shareId}`)}>
                      Öffnen
                    </Button>
                  </CardActions>
                </Card>
              ))}
            </Box>
          </Box>
        )}
      </Container>

      {/* History Dialog */}
      <Dialog open={historyModal !== null} onClose={() => setHistoryModal(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Account Verlauf</DialogTitle>
        <DialogContent dividers>
          {historyModal && historyModal.length > 0 ? (
            <List>
              {[...historyModal].reverse().map((entry, idx) => (
                <React.Fragment key={idx}>
                  <ListItem>
                    <ListItemText 
                      primary={`${entry.user} - ${entry.action}`} 
                      secondary={new Date(entry.timestamp).toLocaleString()} 
                    />
                  </ListItem>
                  {idx < historyModal.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">Noch keine Änderungen erfasst.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryModal(null)}>Schließen</Button>
        </DialogActions>
      </Dialog>

      {/* Character Edit Dialog */}
      <Dialog open={!!editCharactersModal} onClose={() => setEditCharactersModal(null)} maxWidth="md" fullWidth>
        <DialogTitle>Charaktere ansehen & bearbeiten</DialogTitle>
        <DialogContent dividers>
          {editCharactersModal && (
            <CharacterSelector
              title={editCharactersModal.game === 'lol' ? "Champions" : "Agenten"}
              characters={editCharactersModal.game === 'lol' ? formattedChampions : formattedAgents}
              selectedIds={
                (editCharactersModal.game === 'lol' 
                  ? accounts.find(a => a.id === editCharactersModal.accountId)?.lol?.champions 
                  : accounts.find(a => a.id === editCharactersModal.accountId)?.valorant?.characters) || []
              }
              onChange={(ids) => {
                const field = editCharactersModal.game === 'lol' ? 'lol.champions' : 'valorant.characters';
                handleChange(editCharactersModal.accountId, field, ids);
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditCharactersModal(null)} variant="contained">Fertig</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};
