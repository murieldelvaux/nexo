import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { apiClient } from '../services/api';
import { queryKeys } from '../services/queryKeys';
import { useAuth } from './useAuth';
import {
  HouseholdDetailDto,
  CreateHouseholdDto,
  JoinHouseholdDto,
} from '../../../packages/shared/src';

export function useHousehold() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuth();

  const householdQuery = useQuery({
    queryKey: queryKeys.household.current,
    queryFn: async () => {
      const { data } = await apiClient.get<HouseholdDetailDto | null>('/household/current');
      return data;
    },
    enabled: !!user?.householdId,
    retry: false,
  });

  const createHouseholdMutation = useMutation({
    mutationFn: async (dto: CreateHouseholdDto) => {
      const { data } = await apiClient.post<HouseholdDetailDto>('/household/create', dto);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.household.current, data);
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
      router.replace('/(tabs)');
    },
  });

  const joinHouseholdMutation = useMutation({
    mutationFn: async (dto: JoinHouseholdDto) => {
      const { data } = await apiClient.post<HouseholdDetailDto>('/household/join', dto);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.household.current, data);
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
      router.replace('/(tabs)');
    },
  });

  return {
    household: householdQuery.data,
    isLoading: householdQuery.isLoading,
    isRefetching: householdQuery.isRefetching,
    isError: householdQuery.isError,
    createHousehold: createHouseholdMutation.mutateAsync,
    isCreating: createHouseholdMutation.isPending,
    createError: createHouseholdMutation.error,
    joinHousehold: joinHouseholdMutation.mutateAsync,
    isJoining: joinHouseholdMutation.isPending,
    joinError: joinHouseholdMutation.error,
    refetch: householdQuery.refetch,
  };
}
