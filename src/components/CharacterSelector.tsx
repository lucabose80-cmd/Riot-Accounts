import React, { useState, useMemo } from 'react';
import { Box, Typography, Grid, Avatar, Chip, TextField } from '@mui/material';

interface Character {
  id: string;
  name: string;
  imageUrl: string;
  roles: string[];
}

interface CharacterSelectorProps {
  characters: Character[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  title: string;
}

export const CharacterSelector: React.FC<CharacterSelectorProps> = ({ characters, selectedIds, onChange, title }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // Extract all unique roles
  const allRoles = useMemo(() => {
    const roles = new Set<string>();
    characters.forEach(c => c.roles.forEach(r => roles.add(r)));
    return Array.from(roles).sort();
  }, [characters]);

  // Filter and sort characters
  const filteredCharacters = useMemo(() => {
    return characters
      .filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = selectedRole ? c.roles.includes(selectedRole) : true;
        return matchesSearch && matchesRole;
      })
      .sort((a, b) => {
        const aSelected = selectedIds.includes(a.id);
        const bSelected = selectedIds.includes(b.id);
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [characters, selectedIds, searchTerm, selectedRole]);

  const toggleCharacter = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(x => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <Box sx={{ mt: 2, mb: 4 }}>
      <Typography variant="h6" gutterBottom>{title} ({selectedIds.length} / {characters.length})</Typography>
      
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField 
          size="small" 
          placeholder="Search..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: 200 }}
        />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip 
            label="All Roles" 
            onClick={() => setSelectedRole(null)} 
            color={selectedRole === null ? "primary" : "default"}
            variant={selectedRole === null ? "filled" : "outlined"}
          />
          {allRoles.map(role => (
            <Chip 
              key={role} 
              label={role} 
              onClick={() => setSelectedRole(role)}
              color={selectedRole === role ? "primary" : "default"}
              variant={selectedRole === role ? "filled" : "outlined"}
            />
          ))}
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ maxHeight: 400, overflowY: 'auto', p: 1 }}>
        {filteredCharacters.map(char => {
          const isSelected = selectedIds.includes(char.id);
          return (
            <Grid item key={char.id}>
              <Box 
                onClick={() => toggleCharacter(char.id)}
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  opacity: isSelected ? 1 : 0.5,
                  transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all 0.2s',
                  '&:hover': {
                    opacity: 1,
                    transform: 'scale(1.05)',
                  }
                }}
              >
                <Avatar 
                  src={char.imageUrl} 
                  alt={char.name} 
                  sx={{ 
                    width: 64, 
                    height: 64, 
                    mb: 1,
                    border: isSelected ? '3px solid' : '3px solid transparent',
                    borderColor: 'primary.main',
                    filter: isSelected ? 'none' : 'grayscale(100%)'
                  }} 
                />
                <Typography variant="caption" sx={{ maxWidth: 64, textAlign: 'center', lineHeight: 1.1 }}>
                  {char.name}
                </Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};
