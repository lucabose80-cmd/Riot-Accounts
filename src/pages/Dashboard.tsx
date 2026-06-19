import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserAccounts, deleteAccount } from '../services/db';
import { RiotAccount } from '../types';
import { auth } from '../firebase';
import { 
  Container, Typography, Button, Card, CardContent, CardActions, 
  Grid, Box, IconButton, Tooltip, CircularProgress, AppBar, Toolbar 
} from '@mui/material';
import { Plus, LogOut, Edit, Share2, Trash2 } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<RiotAccount[]>([]);
  const [loading, setLoading] = useState(true);

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
    fetchAccounts();
  }, [currentUser]);

  const handleLogout = () => {
    auth.signOut();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      await deleteAccount(id);
      fetchAccounts();
    }
  };

  const handleShare = (shareId: string) => {
    const url = `${window.location.origin}/share/${shareId}`;
    navigator.clipboard.writeText(url);
    alert('Share link copied to clipboard!');
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Riot Accounts
          </Typography>
          <Button color="inherit" onClick={handleLogout} startIcon={<LogOut size={18} />}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1">
            My Accounts
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<Plus size={20} />}
            onClick={() => navigate('/account/new')}
          >
            Add Account
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
            <CircularProgress />
          </Box>
        ) : accounts.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 10 }}>
            <Typography variant="body1" color="text.secondary">
              You haven't added any accounts yet.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {accounts.map((acc) => (
              <Grid item xs={12} md={6} lg={4} key={acc.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h5" component="h2" gutterBottom fontWeight="bold">
                      {acc.ingameName} #{acc.tag}
                    </Typography>
                    <Typography color="text.secondary" gutterBottom>
                      Login: {acc.loginName}
                    </Typography>
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" color="primary">League of Legends</Typography>
                      <Typography variant="body2">Level: {acc.lol.level} | Rank: {acc.lol.rank}</Typography>
                      <Typography variant="body2" color="text.secondary">{acc.lol.champions.length} Champions</Typography>
                    </Box>

                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" color="error">Valorant</Typography>
                      <Typography variant="body2">Level: {acc.valorant.level} | Rank: {acc.valorant.rank}</Typography>
                      <Typography variant="body2" color="text.secondary">{acc.valorant.characters.length} Agents</Typography>
                    </Box>

                    {acc.lastAccessedBy && (
                      <Box sx={{ mt: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" color="text.secondary">
                          Last accessed by shared user: <strong>{acc.lastAccessedBy}</strong>
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'flex-end', p: 2, pt: 0 }}>
                    <Tooltip title="Share Link">
                      <IconButton onClick={() => handleShare(acc.shareId)} color="primary">
                        <Share2 size={20} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Account">
                      <IconButton onClick={() => navigate(`/account/${acc.id}`)} color="secondary">
                        <Edit size={20} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Account">
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
