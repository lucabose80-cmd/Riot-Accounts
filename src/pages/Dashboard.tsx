import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserAccounts, deleteAccount, createSharedLink } from '../services/db';
import { getRankIcon } from '../types';
import type { RiotAccount } from '../types';
import { auth } from '../firebase';
import { fetchLoLChampions, fetchValorantAgents } from '../services/api';
import type { Champion, Agent } from '../services/api';
import { 
  Container, Typography, Button, Card, CardContent, CardActions, 
  Grid, Box, IconButton, Tooltip, CircularProgress, AppBar, Toolbar, Checkbox
} from '@mui/material';
import { Plus, LogOut, Edit, Share2, Trash2 } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<RiotAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  
  const [champions, setChampions] = useState<Champion[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  const fetchAccounts = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await getUserAccounts(currentUser.uid);
      setAccounts(data);
    } catch (error) {
      console.error("Failed to fetch accounts", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadGlobals = async () => {
      try {
        const [champs, agts] = await Promise.all([
          fetchLoLChampions(),
          fetchValorantAgents()
        ]);
        setChampions(champs);
        setAgents(agts);
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
      setSelectedAccounts([]); // Reset
    } catch (err) {
      console.error(err);
      alert('Fehler beim Erstellen des Share-Links.');
    }
  };

  const renderRank = (game: 'lol' | 'valorant' | 'tft', rank: string, level?: number) => {
    const iconUrl = getRankIcon(rank, game);
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {iconUrl && (
          <img src={iconUrl} alt={rank} style={{ width: 40, height: 40, objectFit: 'contain' }} />
        )}
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{rank}</Typography>
          {level !== undefined && <Typography variant="caption" color="text.secondary">Level {level}</Typography>}
        </Box>
      </Box>
    );
  };

  const renderCharacters = (ids: string[], game: 'lol' | 'valorant') => {
    if (!ids || ids.length === 0) return <Typography variant="caption" color="text.secondary">Keine Charaktere</Typography>;
    
    // Get up to 10 characters to display to save space
    const displayIds = ids.slice(0, 10);
    const hasMore = ids.length > 10;
    
    const items = displayIds.map(id => {
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
          <Box
            component="img"
            src={img}
            alt={name}
            sx={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid', borderColor: 'divider' }}
          />
        </Tooltip>
      );
    });

    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
        {items}
        {hasMore && (
          <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'action.selected', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="caption">+{ids.length - 10}</Typography>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Riot Accounts
          </Typography>
          <Button color="inherit" onClick={handleLogout} startIcon={<LogOut size={18} />}>
            Abmelden
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1">
            Meine Accounts
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {selectedAccounts.length > 0 && (
              <Button 
                variant="outlined" 
                color="primary"
                startIcon={<Share2 size={20} />}
                onClick={handleShareSelected}
              >
                Ausgewählte Teilen ({selectedAccounts.length})
              </Button>
            )}
            <Button 
              variant="contained" 
              startIcon={<Plus size={20} />}
              onClick={() => navigate('/account/new')}
            >
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
            <Typography variant="body1" color="text.secondary">
              Du hast noch keine Accounts hinzugefügt.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {accounts.map((acc) => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={acc.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                    <Checkbox 
                      checked={acc.id ? selectedAccounts.includes(acc.id) : false}
                      onChange={() => acc.id && handleToggleSelect(acc.id)}
                    />
                  </Box>
                  <CardContent sx={{ flexGrow: 1, pt: 4 }}>
                    <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
                      {acc.ingameName} <Typography component="span" color="text.secondary">#{acc.server}</Typography>
                    </Typography>
                    <Typography color="text.secondary" gutterBottom>
                      Login: {acc.loginName}
                    </Typography>
                    
                    <Grid container spacing={2} sx={{ mt: 2 }}>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="subtitle2" color="primary">League of Legends</Typography>
                        {renderRank('lol', acc.lol?.rank || 'Unranked', acc.lol?.level || 1)}
                        {renderCharacters(acc.lol?.champions || [], 'lol')}
                      </Grid>

                      <Grid size={{ xs: 6 }}>
                        <Typography variant="subtitle2" color="secondary">TFT</Typography>
                        {renderRank('tft', acc.tft?.rank || 'Unranked')}
                      </Grid>

                      <Grid size={{ xs: 12 }}>
                        <Typography variant="subtitle2" color="error" sx={{ mt: 1 }}>Valorant</Typography>
                        {renderRank('valorant', acc.valorant?.rank || 'Unranked', acc.valorant?.level || 1)}
                        {renderCharacters(acc.valorant?.characters || [], 'valorant')}
                      </Grid>
                    </Grid>

                    {acc.lastAccessedBy && (
                      <Box sx={{ mt: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" color="text.secondary">
                          Zuletzt aktualisiert von: <strong>{acc.lastAccessedBy}</strong>
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'flex-end', p: 2, pt: 0 }}>
                    <Tooltip title="Einzelnen Account bearbeiten">
                      <IconButton onClick={() => navigate(`/account/${acc.id}`)} color="secondary">
                        <Edit size={20} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Account löschen">
                      <IconButton onClick={() => acc.id && handleDelete(acc.id)} color="error">
                        <Trash2 size={20} />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
};
