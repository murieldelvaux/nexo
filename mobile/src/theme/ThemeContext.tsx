import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

export const LightTheme = {
  isDark: false,
  background: '#F8FAFC',        // Off-white suave e refinado
  surface: '#FFFFFF',           // Branco puro para elevação dos cartões
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#F1F5F9',
  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',
  textPrimary: '#0F172A',       // Slate profundo para leitura nítida
  textSecondary: '#64748B',     // Slate médio com excelente contraste
  textMuted: '#94A3B8',
  primary: '#0284C7',           // Azul Nexo (harmônico com o logotipo)
  primaryLight: '#E0F2FE',
  primaryDark: '#0369A1',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  inputBg: '#F8FAFC',
  inputBorder: '#CBD5E1',
  tagSharedBg: '#EFF6FF',
  tagSharedText: '#1D4ED8',
  tagPrivateBg: '#F1F5F9',
  tagPrivateText: '#475569',
  cardShadow: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  fabShadow: {
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const DarkTheme = {
  isDark: true,
  background: '#0B0F19',        // Tom escuro profundo
  surface: '#151D2A',           // Cartão elevado em cinza ardósia
  surfaceElevated: '#1E293B',
  surfaceSubtle: '#1A2333',
  border: '#2A3649',
  borderSubtle: '#1E293B',
  textPrimary: '#F8FAFC',       // Branco nítido
  textSecondary: '#94A3B8',     // Cinza neutro legível
  textMuted: '#64748B',
  primary: '#38BDF8',           // Ciano/azul Nexo vibrante
  primaryLight: 'rgba(56, 189, 248, 0.15)',
  primaryDark: '#0284C7',
  success: '#34D399',
  successLight: 'rgba(52, 211, 153, 0.15)',
  warning: '#FBBF24',
  warningLight: 'rgba(251, 191, 36, 0.15)',
  danger: '#F87171',
  dangerLight: 'rgba(248, 113, 113, 0.15)',
  inputBg: '#1A2333',
  inputBorder: '#2A3649',
  tagSharedBg: 'rgba(56, 189, 248, 0.12)',
  tagSharedText: '#7DD3FC',
  tagPrivateBg: 'rgba(148, 163, 184, 0.12)',
  tagPrivateText: '#CBD5E1',
  cardShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  fabShadow: {
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
};

export type AppTheme = typeof LightTheme;

interface ThemeContextType {
  theme: AppTheme;
  isDark: boolean;
  toggleTheme: () => void;
  setIsDark: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: DarkTheme,
  isDark: true,
  toggleTheme: () => {},
  setIsDark: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === 'dark');

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const theme = isDark ? DarkTheme : LightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setIsDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
