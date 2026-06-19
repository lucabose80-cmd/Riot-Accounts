import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getSharedAccounts, updateAccount } from '../services/db';
import { fetchLoLChampions, fetchValorantAgents, fetchValorantRanksMap } from '../services/api';
import type { Champion, Agent } from '../services/api';
import { LOL_RANKS, VALORANT_RANKS, TFT_RANKS, getRankIcon } from '../types';
import type { RiotAccount, HistoryEntry } from '../types';
import { CharacterSelector } from '../components/CharacterSelector';
import { 
  Container, Typography, TextField, Button, Box, Paper, 
  MenuItem, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton
} from '@mui/material';
import { Plus, Minus, Users } from 'lucide-react';

export const ShareView: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); 
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [accounts, setAccounts] = useState<RiotAccount[]>([]);
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
        
        setAccounts(accs.map(a => ({ ...a, tft: a.tft || { rank: 'Unranked' } })));

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
      const historyEntry: HistoryEntry = {
        timestamp: Date.now(),
        user: visitorName,
        action: 'Account bearbeitet (Gast)'
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
      // Update local state to reflect history
      setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, history: updatedHistory } : a));
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
      if (parts[0] === 'lol') {
        return { ...acc, lol: { ...acc.lol, [parts[1]]: value } };
      } else if (parts[0] === 'valorant') {
        return { ...acc, valorant: { ...acc.valorant, [parts[1]]: value } };
      } else if (parts[0] === 'tft') {
        return { ...acc, tft: { ...acc.tft!, [parts[1]]: value } };
      }
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
    if (game === 'valorant') {
      url = valoRankMap[rank] || null;
    } else {
      url = getRankIcon(rank, game);
    }
    if (!url) return null;
    return <img src={url} alt={rank} style={{ width: 24, height: 24, objectFit: 'contain', marginRight: 8 }} />;
  };

  const LevelInput = ({ value, onChange }: { value: number, onChange: (v: number) => void }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.5 }}>
      <IconButton size="small" onClick={() => onChange(Math.max(1, value - 1))}><Minus size={14} /></IconButton>
      <Typography variant="body2" sx={{ width: 30, textAlign: 'center', fontWeight: 'bold' }}>{value}</Typography>
      <IconButton size="small" onClick={() => onChange(value + 1)}><Plus size={14} /></IconButton>
    </Box>
  );

  const renderBadgeOrText = (count: number, max: number, onClick: () => void) => {
    if (count >= max && max > 0) {
      return (
        <Tooltip title="Charaktere ansehen">
          <Box onClick={onClick} sx={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', bgcolor: 'warning.light', color: 'warning.contrastText', px: 1, py: 0.5, borderRadius: 2, fontSize: '0.75rem', fontWeight: 'bold' }}>
            🌟 Full Access
          </Box>
        </Tooltip>
      );
    }
    return (
      <Tooltip title="Charaktere ansehen/bearbeiten">
        <Box onClick={onClick} sx={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', bgcolor: 'action.hover', px: 1, py: 0.5, borderRadius: 2, fontSize: '0.75rem' }}>
          <Users size={14} style={{ marginRight: 4 }} /> {count} / {max}
        </Box>
      </Tooltip>
    );
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  }

  if (error && accounts.length === 0) {
    return <Container maxWidth="md" sx={{ mt: 8 }}><Alert severity="error">{error}</Alert></Container>;
  }

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

      <Typography variant="h4" component="h1" gutterBottom align="center">
        Freigegebene Accounts
      </Typography>

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
            {accounts.map(account => (
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
                  {renderBadgeOrText(account.lol.champions?.length || 0, champions.length, () => setEditCharactersModal({ accountId: account.id!, game: 'lol' }))}
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
                  {renderBadgeOrText(account.valorant.characters?.length || 0, agents.length, () => setEditCharactersModal({ accountId: account.id!, game: 'valorant' }))}
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
                  <Button variant="contained" size="small" onClick={() => handleUpdateAccount(account)} disabled={saving === account.id}>
                    {saving === account.id ? 'Lädt...' : 'Speichern'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
          <Button onClick={() => setEditCharactersModal(null)} variant="contained">Schließen</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
