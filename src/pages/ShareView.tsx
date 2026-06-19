import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getSharedAccounts, updateAccount } from '../services/db';
import { fetchLoLChampions, fetchValorantAgents, fetchValorantRanksMap } from '../services/api';
import type { Champion, Agent } from '../services/api';
import { LOL_RANKS, VALORANT_RANKS, TFT_RANKS, getRankIcon } from '../types';
import type { RiotAccount, HistoryEntry } from '../types';
import { CharacterSelector } from '../components/CharacterSelector';
import { generateHistoryDiff } from '../utils/history';
import { 
  Container, Typography, TextField, Button, Box, Paper, 
  MenuItem, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton
} from '@mui/material';
import { Plus, Minus } from 'lucide-react';

export const ShareView: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); 
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [accounts, setAccounts] = useState<RiotAccount[]>([]);
  const [originalAccounts, setOriginalAccounts] = useState<Record<string, RiotAccount>>({});
  
  const [champions, setChampions] = useState<Champion[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [valoRankMap, setValoRankMap] = useState<Record<string, string>>({});

  const [visitorName, setVisitorName] = useState(() => localStorage.getItem('riot_visitor_name') || '');
  const [showNameDialog, setShowNameDialog] = useState(!localStorage.getItem('riot_visitor_name'));
  const [tempName, setTempName] = useState(visitorName);
  
  const [editCharactersModal, setEditCharactersModal] = useState<{ accountId: string, game: 'lol' | 'valorant' } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!shareId) return;
      setLoading(true);
      try {
        const accs = await getSharedAccounts(shareId);
        if (accs.length === 0) {
          setError("Dieser Share-Link ist ungültig oder abgelaufen.");
          setLoading(false);
          return;
        }
        
        const preparedAccs = accs.map(a => ({ ...a, tft: a.tft || { rank: 'Unranked' } }));
        setAccounts(preparedAccs);
        
        const orig: Record<string, RiotAccount> = {};
        preparedAccs.forEach(a => orig[a.id!] = JSON.parse(JSON.stringify(a)));
        setOriginalAccounts(orig);

        const [champs, agts, vRanks] = await Promise.all([
          fetchLoLChampions(),
          fetchValorantAgents(),
          fetchValorantRanksMap()
        ]);
        setChampions(champs);
        setAgents(agts);
        setValoRankMap(vRanks);
      } catch (err) {
        console.error(err);
        setError("Fehler beim Laden der Daten.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [shareId]);

  const handleSaveName = () => {
    if (!tempName.trim()) return;
    setVisitorName(tempName);
    localStorage.setItem('riot_visitor_name', tempName);
    setShowNameDialog(false);
  };

  const handleUpdateAccount = async (account: RiotAccount) => {
    if (!account.id) return;
    setSaving(account.id);
    setSuccess('');
    setError('');

    try {
      const oldAcc = originalAccounts[account.id];
      const diffs = generateHistoryDiff(oldAcc, account);
      
      let actionMsg = 'Account bearbeitet (Gast)';
      if (diffs.length > 0) {
        actionMsg = diffs.join(', ');
      }

      const historyEntry: HistoryEntry = {
        timestamp: Date.now(),
        user: visitorName,
        action: actionMsg
      };
      
      const updatedHistory = [...(account.history || []), historyEntry];

      await updateAccount(account.id, {
        lol: account.lol,
        valorant: account.valorant,
        tft: account.tft,
        lastAccessedBy: visitorName,
        history: updatedHistory
      });
      setSuccess(`${account.ingameName} wurde erfolgreich aktualisiert!`);
      
      setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, history: updatedHistory } : a));
      setOriginalAccounts(prev => ({ ...prev, [account.id!]: JSON.parse(JSON.stringify({ ...account, history: updatedHistory })) }));
    } catch (err: any) {
      setError(`Fehler bei ${account.ingameName}: ` + err.message);
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
    let size = 40; // LoL and TFT should be 40px
    if (game === 'valorant') {
      url = valoRankMap[rank] || null;
      size = 32; // Valo is fine at 32px
    } else {
      url = getRankIcon(rank, game);
    }
    if (!url) return null;
    return <img src={url} alt={rank} style={{ width: size, height: size, objectFit: 'contain', marginRight: 8 }} />;
  };

  const LevelInput = ({ value, onChange }: { value: number, onChange: (v: number) => void }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.5 }}>
      <IconButton size="small" onClick={() => onChange(Math.max(1, value - 1))}><Minus size={14} /></IconButton>
      <Typography variant="body2" sx={{ width: 30, textAlign: 'center', fontWeight: 'bold' }}>{value}</Typography>
      <IconButton size="small" onClick={() => onChange(value + 1)}><Plus size={14} /></IconButton>
    </Box>
  );

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

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  if (error && accounts.length === 0) return <Container maxWidth="md" sx={{ mt: 8 }}><Alert severity="error">{error}</Alert></Container>;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
      <Dialog open={showNameDialog}>
        <DialogTitle>Wer bist du?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Bitte gib deinen Namen ein, damit der Besitzer nachvollziehen kann, wer was bearbeitet hat.
          </Typography>
          <TextField autoFocus fullWidth label="Dein Name" value={tempName} onChange={(e) => setTempName(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSaveName} variant="contained" disabled={!tempName.trim()}>Weiter</Button>
        </DialogActions>
      </Dialog>

      <Typography variant="h4" component="h1" gutterBottom align="center">Freigegebene Accounts</Typography>

      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <TableContainer component={Paper} elevation={3}>
        <Table sx={{ minWidth: 800 }}>
          <TableHead sx={{ bgcolor: 'background.default' }}>
            <TableRow>
              <TableCell>Account</TableCell>
              <TableCell>League of Legends</TableCell>
              <TableCell>Valorant</TableCell>
              <TableCell>TFT</TableCell>
              <TableCell align="right">Aktion</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {accounts.map(account => {
              const isDirty = JSON.stringify(account) !== JSON.stringify(originalAccounts[account.id!]);
              return (
                <TableRow key={account.id} hover>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{account.ingameName}</Typography>
                    <Typography variant="caption" color="text.secondary">Server: {account.server}</Typography><br/>
                    <Typography variant="caption" color="text.secondary">Login: {account.loginName}</Typography><br/>
                    <Typography variant="caption" color="text.secondary">PW: {account.password || '-'}</Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <LevelInput value={account.lol.level} onChange={(v) => handleChange(account.id!, 'lol.level', v)} />
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {renderRankIcon('lol', account.lol.rank)}
                        <TextField select size="small" variant="standard" value={account.lol.rank} onChange={(e) => handleChange(account.id!, 'lol.rank', e.target.value)}>
                          {LOL_RANKS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                        </TextField>
                      </Box>
                    </Box>
                    {renderCharacters(account.lol.champions, 'lol', () => setEditCharactersModal({ accountId: account.id!, game: 'lol' }))}
                  </TableCell>

                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <LevelInput value={account.valorant.level} onChange={(v) => handleChange(account.id!, 'valorant.level', v)} />
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {renderRankIcon('valorant', account.valorant.rank)}
                        <TextField select size="small" variant="standard" value={account.valorant.rank} onChange={(e) => handleChange(account.id!, 'valorant.rank', e.target.value)}>
                          {VALORANT_RANKS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                        </TextField>
                      </Box>
                    </Box>
                    {renderCharacters(account.valorant.characters, 'valorant', () => setEditCharactersModal({ accountId: account.id!, game: 'valorant' }))}
                  </TableCell>

                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {renderRankIcon('tft', account.tft?.rank || 'Unranked')}
                      <TextField select size="small" variant="standard" value={account.tft?.rank || 'Unranked'} onChange={(e) => handleChange(account.id!, 'tft.rank', e.target.value)}>
                        {TFT_RANKS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                      </TextField>
                    </Box>
                  </TableCell>

                  <TableCell align="right">
                    <Button 
                      variant={isDirty ? "contained" : "outlined"} 
                      color={isDirty ? "primary" : "inherit"}
                      size="small" 
                      onClick={() => handleUpdateAccount(account)} 
                      disabled={saving === account.id || !isDirty}
                    >
                      {saving === account.id ? 'Lädt...' : 'Speichern'}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

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
    </Container>
  );
};
