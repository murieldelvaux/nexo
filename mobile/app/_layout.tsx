import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import { appQueryClient } from '../src/services/queryClient';
import { Colors } from '../src/theme/colors';
import { authService } from '../src/services/auth.service';
import { queryKeys } from '../src/services/queryKeys';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();

  const userQuery = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async () => {
      try {
        return await authService.getMe();
      } catch {
        return null;
      }
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  useEffect(() => {
    if (userQuery.isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isAuthenticated = !!userQuery.data;

    if (!isAuthenticated && !inAuthGroup) {
      // Redireciona para login se não autenticado
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redireciona para o app se já autenticado
      if (!userQuery.data?.householdId) {
        router.replace('/(household)/join');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [userQuery.isLoading, userQuery.data, segments]);

  // Tela de loading enquanto verifica autenticação
  if (userQuery.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={appQueryClient}>
        <StatusBar style="light" />
        <AuthGuard>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.background },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(household)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </AuthGuard>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
