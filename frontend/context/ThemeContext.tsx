import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useColorSchemeCore } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeType = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeType;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorSchemeCore();
  const [theme, setTheme] = useState<ThemeType>('light');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load persisted theme preference on mount
    AsyncStorage.getItem('theme_preference').then((savedTheme) => {
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
      } else {
        // Fallback to system color scheme
        setTheme(systemScheme === 'dark' ? 'dark' : 'light');
      }
      setIsLoaded(true);
    });
  }, []);

  // Update theme dynamically if system preference changes and user hasn't set an explicit preference
  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.getItem('theme_preference').then((savedTheme) => {
      if (!savedTheme) {
        setTheme(systemScheme === 'dark' ? 'dark' : 'light');
      }
    });
  }, [systemScheme, isLoaded]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    AsyncStorage.setItem('theme_preference', nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeContext);
