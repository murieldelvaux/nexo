import React from 'react';
import { Tabs } from 'expo-router';
import { Text, Platform } from 'react-native';
import { Colors } from '../../src/theme/colors';

// Detecta altura segura da tab bar de forma cross-platform
const TAB_BAR_HEIGHT = Platform.select({ ios: 88, default: 64 }) ?? 64;
const TAB_BAR_PADDING_BOTTOM = Platform.select({ ios: 28, default: 10 }) ?? 10;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: TAB_BAR_HEIGHT,
          paddingTop: 8,
          paddingBottom: TAB_BAR_PADDING_BOTTOM,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
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
          title: 'Config',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}
