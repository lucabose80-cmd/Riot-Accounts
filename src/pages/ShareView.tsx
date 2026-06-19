import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getSharedAccounts, updateAccount } from '../services/db';
import { fetchLoLChampions, fetchValorantAgents } from '../services/api';
import type { Champion, Agent } from '../services/api';
import { LOL_RANKS, VALORANT_RANKS, TFT_RANKS } from '../types';
import type { RiotAccount } from '../types';
import { CharacterSelector } from '../components/CharacterSelector';
import { 
  Container, Typography, TextField, Button, Box, Paper, 
  Grid, MenuItem, CircularProgress, Divider, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip
} from '@mui/material';

export const ShareView: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // store saving account id
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [accounts, setAccounts] = useState<RiotAccount[]>([]);
  const [champions, setChampions] = useState<Champion[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

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
        
        // Ensure tft object exists
        setAccounts(accs.map(a => ({ ...a, tft: a.tft || { rank: 'Unranked' } })));

        const [champs, agts] = await Promise.all([
          fetchLoLChampions(),
          fetchValorantAgents()
        ]);
        setChampions(champs);
        setAgents(agts);
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
      await updateAccount(account.id, {
        lol: account.lol,
        valorant: account.valorant,
        tft: account.tft,
        lastAccessedBy: visitorName
      });
      setSuccess(`${account.ingameName} wurde erfolgreich aktualisiert!`);
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

  const renderReadonlyCharacters = (ids: string[], game: 'lol' | 'valorant') => {
    if (!ids || ids.length === 0) return <Typography variant="body2" color="text.secondary">Keine</Typography>;
    
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
        {ids.map(id => {
          let img = '';
          let name = '';
          if (game === 'lol') {
            const c = champions.find(c => c.id === id);
            img = c?.imageUrl || '';
            name = c?.name || id;
          } else {
            const a = agents.find(a => a.uuid === id);
            img = a?.displayIcon || '';
            name = a?.displayName || id;
          }
          return (
            <Tooltip key={id} title={name}>
              <Box component="img" src={img} alt={name} sx={{ width: 32, height: 32, borderRadius: '50%' }} />
            </Tooltip>
          );
        })}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && accounts.length === 0) {
    return (
      <Container maxWidth="md" sx={{ mt: 8 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Dialog open={showNameDialog}>
        <DialogTitle>Wer bist du?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Bitte gib deinen Namen ein, damit der Besitzer weiß, wer den Account aktualisiert hat.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Dein Name"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSaveName} variant="contained" disabled={!tempName.trim()}>
            Weiter
          </Button>
        </DialogActions>
      </Dialog>

      <Typography variant="h4" component="h1" gutterBottom align="center">
        Freigegebene Accounts
      </Typography>

      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {accounts.map(account => (
        <Paper elevation={3} sx={{ p: 4, mb: 4 }} key={account.id}>
          <Box sx={{ bgcolor: 'background.default', p: 3, borderRadius: 2, mb: 4 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">Ingame Name</Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{account.ingameName} #{account.server}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">Login Name</Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{account.loginName}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">Passwort</Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{account.password || 'Nicht angegeben'}</Typography>
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ my: 4 }} />

          <Grid container spacing={4}>
            {/* LOL Section */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" sx={{ color: 'primary.main', mb: 2 }}>League of Legends</Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField 
                  size="small" label="Level" type="number" 
                  value={account.lol.level} 
                  onChange={(e) => handleChange(account.id!, 'lol.level', Number(e.target.value))} 
                />
                <TextField 
                  select size="small" label="Rang" 
                  value={account.lol.rank} 
                  onChange={(e) => handleChange(account.id!, 'lol.rank', e.target.value)}
                >
                  {LOL_RANKS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </TextField>
              </Box>
              <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2">Freigeschaltete Champions</Typography>
                <Button size="small" variant="outlined" onClick={() => setEditCharactersModal({ accountId: account.id!, game: 'lol' })}>
                  Bearbeiten
                </Button>
              </Box>
              {renderReadonlyCharacters(account.lol.champions, 'lol')}
            </Grid>

            {/* Valorant Section */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" sx={{ color: 'error.main', mb: 2 }}>Valorant</Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField 
                  size="small" label="Level" type="number" 
                  value={account.valorant.level} 
                  onChange={(e) => handleChange(account.id!, 'valorant.level', Number(e.target.value))} 
                />
                <TextField 
                  select size="small" label="Rang" 
                  value={account.valorant.rank} 
                  onChange={(e) => handleChange(account.id!, 'valorant.rank', e.target.value)}
                >
                  {VALORANT_RANKS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </TextField>
              </Box>
              <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2">Freigeschaltete Agenten</Typography>
                <Button size="small" variant="outlined" onClick={() => setEditCharactersModal({ accountId: account.id!, game: 'valorant' })}>
                  Bearbeiten
                </Button>
              </Box>
              {renderReadonlyCharacters(account.valorant.characters, 'valorant')}
            </Grid>

            {/* TFT Section */}
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ color: 'secondary.main', mb: 2 }}>TFT</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField 
                  select size="small" label="TFT Rang" 
                  value={account.tft?.rank || 'Unranked'} 
                  onChange={(e) => handleChange(account.id!, 'tft.rank', e.target.value)}
                >
                  {TFT_RANKS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </TextField>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="contained" 
              onClick={() => handleUpdateAccount(account)}
              disabled={saving === account.id}
            >
              {saving === account.id ? 'Speichert...' : 'Schnell-Update Speichern'}
            </Button>
          </Box>
        </Paper>
      ))}

      {/* Character Edit Dialog */}
      <Dialog 
        open={!!editCharactersModal} 
        onClose={() => setEditCharactersModal(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Charaktere bearbeiten</DialogTitle>
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
