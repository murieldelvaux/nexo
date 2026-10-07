import React from 'react';
import { Tabs } from 'expo-router';
import { Text, Platform } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';

// Detecta altura segura da tab bar de forma cross-platform
const TAB_BAR_HEIGHT = Platform.select({ ios: 88, default: 64 }) ?? 64;
const TAB_BAR_PADDING_BOTTOM = Platform.select({ ios: 28, default: 10 }) ?? 10;

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          height: TAB_BAR_HEIGHT,
          paddingTop: 8,
          paddingBottom: TAB_BAR_PADDING_BOTTOM,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Resumo',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📊</Text>,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Gastos',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>💸</Text>,
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Metas',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🎯</Text>,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Rotina',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📌</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}
