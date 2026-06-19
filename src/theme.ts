import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
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
          backgroundImage: 'none', // remove dark mode elevation overlay
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
});
