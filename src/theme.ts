import { createTheme } from '@mui/material/styles';
import type { ThemeOptions } from '@mui/material/styles';

const baseOptions: ThemeOptions = {
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 24, // MD3 rounded buttons
          padding: '10px 24px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 1px 3px 1px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.30)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          backgroundImage: 'none', 
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
          },
        },
      },
    },
  },
};

export const defaultTheme = createTheme({
  ...baseOptions,
  palette: {
    mode: 'dark',
    primary: {
      main: '#D0BCFF', // MD3 primary for dark mode
      contrastText: '#381E72',
    },
    secondary: {
      main: '#CCC2DC',
      contrastText: '#332D41',
    },
    error: {
      main: '#F2B8B5',
      contrastText: '#601410',
    },
    background: {
      default: '#141218',
      paper: '#211F26',
    },
    text: {
      primary: '#E6E1E5',
      secondary: '#CAC4D0',
    },
  },
});

export const hextechTheme = createTheme({
  ...baseOptions,
  palette: {
    mode: 'dark',
    primary: {
      main: '#C8AA6E', // Hextech Gold
      contrastText: '#091428',
    },
    secondary: {
      main: '#0AC8B9', // Hextech Blue Bright
      contrastText: '#091428',
    },
    error: {
      main: '#FF4E50',
      contrastText: '#ffffff',
    },
    background: {
      default: '#0A1428', // LoL Client Dark Blue
      paper: '#091428', // Slightly darker blue
    },
    text: {
      primary: '#F0E6D2',
      secondary: '#A09B8C',
    },
  },
});

export const valorantTheme = createTheme({
  ...baseOptions,
  palette: {
    mode: 'dark',
    primary: {
      main: '#FF4655', // Valorant Red
      contrastText: '#ECE8E1',
    },
    secondary: {
      main: '#0F1923', // Valorant Dark Blue/Black
      contrastText: '#ECE8E1',
    },
    error: {
      main: '#FF4655',
      contrastText: '#ECE8E1',
    },
    background: {
      default: '#111111', // Very dark
      paper: '#1F2326', // Panel dark
    },
    text: {
      primary: '#ECE8E1', // Valorant off-white
      secondary: '#8B978F',
    },
  },
  typography: {
    ...baseOptions.typography,
    fontFamily: '"Oswald", "Inter", sans-serif',
  }
});
