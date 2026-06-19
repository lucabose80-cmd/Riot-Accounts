import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getAccountByShareId, updateAccount } from '../services/db';
import { fetchLoLChampions, fetchValorantAgents, Champion, Agent } from '../services/api';
import { RiotAccount, LOL_RANKS, VALORANT_RANKS } from '../types';
import { CharacterSelector } from '../components/CharacterSelector';
import { 
  Container, Typography, TextField, Button, Box, Paper, 
  Grid, MenuItem, CircularProgress, Divider, Alert, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';

export const ShareView: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [account, setAccount] = useState<RiotAccount | null>(null);
  const [champions, setChampions] = useState<Champion[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  const [visitorName, setVisitorName] = useState(() => localStorage.getItem('riot_visitor_name') || '');
  const [showNameDialog, setShowNameDialog] = useState(!localStorage.getItem('riot_visitor_name'));
  const [tempName, setTempName] = useState(visitorName);

  useEffect(() => {
    const loadData = async () => {
      if (!shareId) return;
      setLoading(true);
      try {
        const acc = await getAccountByShareId(shareId);
        if (!acc) {
          setError("This shared account link is invalid or has expired.");
          setLoading(false);
          return;
        }
        setAccount(acc);

        const [champs, agts] = await Promise.all([
          fetchLoLChampions(),
          fetchValorantAgents()
        ]);
        setChampions(champs);
        setAgents(agts);
      } catch (err) {
        console.error(err);
        setError("Failed to load data.");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !account.id) return;
    
    setSaving(true);
    setSuccess('');
    setError('');

    try {
      await updateAccount(account.id, {
        lol: account.lol,
        valorant: account.valorant,
        lastAccessedBy: visitorName
      });
      setSuccess('Account progress updated successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('lol.')) {
      const field = name.split('.')[1];
      setAccount(prev => {
        if (!prev) return prev;
        return { ...prev, lol: { ...prev.lol, [field]: field === 'level' ? Number(value) : value } };
      });
    } else if (name.startsWith('valorant.')) {
      const field = name.split('.')[1];
      setAccount(prev => {
        if (!prev) return prev;
        return { ...prev, valorant: { ...prev.valorant, [field]: field === 'level' ? Number(value) : value } };
      });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !account) {
    return (
      <Container maxWidth="md" sx={{ mt: 8 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!account) return null;

  const formattedChampions = champions.map(c => ({
    id: c.id, name: c.name, imageUrl: c.imageUrl, roles: c.tags
  }));

  const formattedAgents = agents.map(a => ({
    id: a.uuid, name: a.displayName, imageUrl: a.displayIcon, roles: a.role ? [a.role.displayName] : ['Unknown']
  }));

  return (
    <Container maxWidth="md" sx={{ mt: 8, mb: 8 }}>
      <Dialog open={showNameDialog} disableEscapeKeyDown>
        <DialogTitle>Who are you?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Please enter your name so the account owner knows who is updating their progress.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Your Name"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSaveName} variant="contained" disabled={!tempName.trim()}>
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Shared Account View
        </Typography>
        
        <Box sx={{ bgcolor: 'background.default', p: 3, borderRadius: 2, mb: 4, mt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Ingame Name</Typography>
              <Typography variant="body1" fontWeight="bold">{account.ingameName} #{account.tag}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Login Name</Typography>
              <Typography variant="body1" fontWeight="bold">{account.loginName}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">Password</Typography>
              <Typography variant="body1" fontWeight="bold">{account.password || 'Not provided'}</Typography>
            </Grid>
          </Grid>
        </Box>

        {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Typography variant="body2" color="text.secondary" gutterBottom>
          You can update the account's level, rank, and unlocked characters below.
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <Divider sx={{ my: 4 }} />

          <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>League of Legends</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label="Level" name="lol.level" type="number" value={account.lol.level} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth required label="Rank" name="lol.rank" value={account.lol.rank} onChange={handleChange}>
                {LOL_RANKS.map(rank => (
                  <MenuItem key={rank} value={rank}>{rank}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <CharacterSelector 
            title="Unlocked Champions"
            characters={formattedChampions}
            selectedIds={account.lol.champions}
            onChange={(ids) => setAccount(prev => prev ? ({ ...prev, lol: { ...prev.lol, champions: ids } }) : prev)}
          />

          <Divider sx={{ my: 4 }} />

          <Typography variant="h6" sx={{ mb: 2, color: 'error.main' }}>Valorant</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label="Level" name="valorant.level" type="number" value={account.valorant.level} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth required label="Rank" name="valorant.rank" value={account.valorant.rank} onChange={handleChange}>
                {VALORANT_RANKS.map(rank => (
                  <MenuItem key={rank} value={rank}>{rank}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <CharacterSelector 
            title="Unlocked Agents"
            characters={formattedAgents}
            selectedIds={account.valorant.characters}
            onChange={(ids) => setAccount(prev => prev ? ({ ...prev, valorant: { ...prev.valorant, characters: ids } }) : prev)}
          />

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            <Button type="submit" variant="contained" size="large" disabled={saving}>
              {saving ? 'Saving...' : 'Update Account Progress'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};
