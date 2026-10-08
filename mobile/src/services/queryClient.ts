import { QueryClient } from '@tanstack/react-query';

export const appQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 1, // 1 segundo
      gcTime: 1000 * 60 * 10, // 10 minutos
      retry: 1,
      refetchInterval: 1500, // Atualização a cada 1.5s como fallback do SSE
      refetchIntervalInBackground: false, // Pausa em background
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
