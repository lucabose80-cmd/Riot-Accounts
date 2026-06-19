import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { defaultTheme, hextechTheme, valorantTheme } from '../theme';

type ThemeName = 'default' | 'hextech' | 'valorant';

interface ThemeContextType {
  currentTheme: ThemeName;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: 'default',
  setTheme: () => {},
});

export const useAppTheme = () => useContext(ThemeContext);

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('default');

  useEffect(() => {
    const saved = localStorage.getItem('appTheme') as ThemeName;
    if (saved && ['default', 'hextech', 'valorant'].includes(saved)) {
      setCurrentTheme(saved);
    }
  }, []);

  const handleSetTheme = (name: ThemeName) => {
    setCurrentTheme(name);
    localStorage.setItem('appTheme', name);
  };

  const themeToApply = 
    currentTheme === 'hextech' ? hextechTheme :
    currentTheme === 'valorant' ? valorantTheme :
    defaultTheme;

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme: handleSetTheme }}>
      <MuiThemeProvider theme={themeToApply}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
