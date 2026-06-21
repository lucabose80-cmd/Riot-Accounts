import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createAccount, updateAccount, getUserAccounts } from '../services/db';
import { fetchLoLChampions, fetchValorantAgents } from '../services/api';
import type { Champion, Agent } from '../services/api';
import { LOL_RANKS, VALORANT_RANKS, TFT_RANKS } from '../types';
import type { RiotAccount } from '../types';
import { CharacterSelector } from '../components/CharacterSelector';
import { 
  Container, Typography, TextField, Button, Box, Paper, 
  Grid, MenuItem, CircularProgress, Divider, Alert, Select, OutlinedInput, Checkbox, ListItemText, FormControl, InputLabel,
  AppBar, Toolbar
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
    server: '',
    loginName: '',
    password: '',
    email: '',
    lol: { level: 1, rank: 'Unranked', champions: [] },
    valorant: { level: 1, rank: 'Unranked', characters: [] },
    tft: { rank: 'Unranked' },
    notes: '',
    mainRoles: []
  });

  const AVAILABLE_ROLES = [
    'Toplane', 'Jungle', 'Midlane', 'ADC', 'Support',
    'Duelist', 'Initiator', 'Controller', 'Sentinel'
  ];

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
          const userAccs = await getUserAccounts(currentUser.uid);
          const existingAcc = userAccs.find(a => a.id === id);
          if (existingAcc) {
            // Ensure tft object exists for older accounts
            if (!existingAcc.tft) existingAcc.tft = { rank: 'Unranked' };
            setAccount(existingAcc);
          } else {
            setError("Account nicht gefunden oder keine Berechtigung.");
          }
        }
      } catch (err) {
        console.error(err);
        setError("Fehler beim Laden der Daten.");
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
        await createAccount({
          ...(account as RiotAccount),
          userId: currentUser.uid,
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
    } else if (name.startsWith('tft.')) {
      const field = name.split('.')[1];
      setAccount(prev => ({
        ...prev,
        tft: { ...prev.tft!, [field]: value }
      }));
    } else {
      setAccount(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleRolesChange = (event: any) => {
    const {
      target: { value },
    } = event;
    setAccount(prev => ({
      ...prev,
      mainRoles: typeof value === 'string' ? value.split(',') : value,
    }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  const formattedChampions = champions.map(c => ({
    id: c.id,
    name: c.name,
    imageUrl: c.imageUrl || '',
    roles: c.tags
  }));

  const formattedAgents = agents.map(a => ({
    id: a.uuid,
    name: a.displayName,
    imageUrl: a.displayIcon,
    roles: a.role ? [a.role.displayName] : ['Unbekannt']
  }));

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
          paddingRight: '140px' // Leave space for native window controls
        }}
      >
        <Toolbar>
          <Box sx={{ WebkitAppRegion: 'no-drag' }}>
            <Button color="inherit" startIcon={<ArrowLeft />} onClick={() => navigate('/')}>
              Zurück zum Dashboard
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {isNew ? 'Neuen Account hinzufügen' : 'Account bearbeiten'}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <Typography variant="h6" sx={{ mt: 2, mb: 2, color: 'primary.main' }}>Allgemeine Informationen</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth required label="Ingame Name" name="ingameName" value={account.ingameName || ''} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth required label="Server (z.B. EUW)" name="server" value={account.server || ''} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth required label="Login Name" name="loginName" value={account.loginName || ''} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Passwort" name="password" type="password" value={account.password || ''} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth required label="E-Mail Adresse" name="email" type="email" value={account.email || ''} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Main Rollen</InputLabel>
                <Select
                  multiple
                  value={account.mainRoles || []}
                  onChange={handleRolesChange}
                  input={<OutlinedInput label="Main Rollen" />}
                  renderValue={(selected) => selected.join(', ')}
                >
                  {AVAILABLE_ROLES.map((role) => (
                    <MenuItem key={role} value={role}>
                      <Checkbox checked={(account.mainRoles || []).indexOf(role) > -1} />
                      <ListItemText primary={role} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Notizen (optional)" name="notes" multiline rows={3} value={account.notes || ''} onChange={handleChange} placeholder="Z.B. Smurf, Banned bis..." />
            </Grid>
          </Grid>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>League of Legends</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth required label="Level" name="lol.level" type="number" value={account.lol?.level || 1} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth required label="Rang" name="lol.rank" value={account.lol?.rank || 'Unranked'} onChange={handleChange}>
                {LOL_RANKS.map(rank => (
                  <MenuItem key={rank} value={rank}>{rank}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <CharacterSelector 
            title="Freigeschaltete Champions"
            characters={formattedChampions}
            selectedIds={account.lol?.champions || []}
            onChange={(ids) => setAccount(prev => ({ ...prev, lol: { ...prev.lol!, champions: ids } }))}
          />

          <Divider sx={{ my: 4 }} />

          <Typography variant="h6" sx={{ mb: 2, color: 'secondary.main' }}>Teamfight Tactics (TFT)</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth required label="TFT Rang" name="tft.rank" value={account.tft?.rank || 'Unranked'} onChange={handleChange}>
                {TFT_RANKS.map(rank => (
                  <MenuItem key={rank} value={rank}>{rank}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h6" sx={{ mb: 2, color: 'error.main' }}>Valorant</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth required label="Level" name="valorant.level" type="number" value={account.valorant?.level || 1} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth required label="Rang" name="valorant.rank" value={account.valorant?.rank || 'Unranked'} onChange={handleChange}>
                {VALORANT_RANKS.map(rank => (
                  <MenuItem key={rank} value={rank}>{rank}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <CharacterSelector 
            title="Freigeschaltete Agenten"
            characters={formattedAgents}
            selectedIds={account.valorant?.characters || []}
            onChange={(ids) => setAccount(prev => ({ ...prev, valorant: { ...prev.valorant!, characters: ids } }))}
          />

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="outlined" onClick={() => navigate('/')}>Abbrechen</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Wird gespeichert...' : 'Account Speichern'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
    </Box>
  );
};
