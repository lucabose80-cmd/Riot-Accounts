import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAccountByShareId, createAccount, updateAccount, getUserAccounts } from '../services/db';
import { fetchLoLChampions, fetchValorantAgents, Champion, Agent } from '../services/api';
import { RiotAccount, LOL_RANKS, VALORANT_RANKS } from '../types';
import { CharacterSelector } from '../components/CharacterSelector';
import { 
  Container, Typography, TextField, Button, Box, Paper, 
  Grid, MenuItem, CircularProgress, Divider, Alert
} from '@mui/material';
import { ArrowLeft } from 'lucide-react';

export const AccountDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [champions, setChampions] = useState<Champion[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  const [account, setAccount] = useState<Partial<RiotAccount>>({
    ingameName: '',
    tag: '',
    loginName: '',
    password: '',
    email: '',
    lol: { level: 1, rank: 'Unranked', champions: [] },
    valorant: { level: 1, rank: 'Unranked', characters: [] },
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [champs, agts] = await Promise.all([
          fetchLoLChampions(),
          fetchValorantAgents()
        ]);
        setChampions(champs);
        setAgents(agts);

        if (!isNew && id && currentUser) {
          // Fetch existing account. Since we don't have a getAccountById we use getUserAccounts and filter
          // In a real app we'd have getAccountById, but let's do this for simplicity given our db.ts
          const userAccs = await getUserAccounts(currentUser.uid);
          const existingAcc = userAccs.find(a => a.id === id);
          if (existingAcc) {
            setAccount(existingAcc);
          } else {
            setError("Account not found or you don't have permission.");
          }
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, isNew, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setSaving(true);
    setError('');

    try {
      if (isNew) {
        const shareId = Math.random().toString(36).substring(2, 10);
        await createAccount({
          ...(account as RiotAccount),
          userId: currentUser.uid,
          shareId,
        });
      } else if (id) {
        await updateAccount(id, account);
      }
      navigate('/');
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
      setAccount(prev => ({
        ...prev,
        lol: { ...prev.lol!, [field]: field === 'level' ? Number(value) : value }
      }));
    } else if (name.startsWith('valorant.')) {
      const field = name.split('.')[1];
      setAccount(prev => ({
        ...prev,
        valorant: { ...prev.valorant!, [field]: field === 'level' ? Number(value) : value }
      }));
    } else {
      setAccount(prev => ({ ...prev, [name]: value }));
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Format characters for the selector
  const formattedChampions = champions.map(c => ({
    id: c.id,
    name: c.name,
    imageUrl: c.imageUrl,
    roles: c.tags
  }));

  const formattedAgents = agents.map(a => ({
    id: a.uuid,
    name: a.displayName,
    imageUrl: a.displayIcon,
    roles: a.role ? [a.role.displayName] : ['Unknown']
  }));

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      <Button startIcon={<ArrowLeft />} onClick={() => navigate('/')} sx={{ mb: 2 }}>
        Back to Dashboard
      </Button>
      
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {isNew ? 'Add New Account' : 'Edit Account'}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <Typography variant="h6" sx={{ mt: 2, mb: 2, color: 'primary.main' }}>General Information</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label="Ingame Name" name="ingameName" value={account.ingameName || ''} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label="Tagline (e.g. EUW)" name="tag" value={account.tag || ''} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label="Login Name" name="loginName" value={account.loginName || ''} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Password" name="password" type="password" value={account.password || ''} onChange={handleChange} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth required label="Email Address" name="email" type="email" value={account.email || ''} onChange={handleChange} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>League of Legends</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label="Level" name="lol.level" type="number" value={account.lol?.level || 1} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth required label="Rank" name="lol.rank" value={account.lol?.rank || 'Unranked'} onChange={handleChange}>
                {LOL_RANKS.map(rank => (
                  <MenuItem key={rank} value={rank}>{rank}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <CharacterSelector 
            title="Unlocked Champions"
            characters={formattedChampions}
            selectedIds={account.lol?.champions || []}
            onChange={(ids) => setAccount(prev => ({ ...prev, lol: { ...prev.lol!, champions: ids } }))}
          />

          <Divider sx={{ my: 4 }} />

          <Typography variant="h6" sx={{ mb: 2, color: 'error.main' }}>Valorant</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label="Level" name="valorant.level" type="number" value={account.valorant?.level || 1} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth required label="Rank" name="valorant.rank" value={account.valorant?.rank || 'Unranked'} onChange={handleChange}>
                {VALORANT_RANKS.map(rank => (
                  <MenuItem key={rank} value={rank}>{rank}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <CharacterSelector 
            title="Unlocked Agents"
            characters={formattedAgents}
            selectedIds={account.valorant?.characters || []}
            onChange={(ids) => setAccount(prev => ({ ...prev, valorant: { ...prev.valorant!, characters: ids } }))}
          />

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="outlined" onClick={() => navigate('/')}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Saving...' : 'Save Account'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};
