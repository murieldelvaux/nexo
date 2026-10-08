import { QueryClient } from '@tanstack/react-query';

export const appQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 3, // 3 segundos
      gcTime: 1000 * 60 * 10, // 10 minutos
      retry: 1,
      refetchInterval: 3000, // Atualização em tempo real a cada 3 segundos
      refetchIntervalInBackground: false, // Não gasta dados/bateria em segundo plano
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
