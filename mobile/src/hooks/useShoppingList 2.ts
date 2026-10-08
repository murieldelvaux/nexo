import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shoppingListService } from '../services/shoppingList.service';
import { queryKeys } from '../services/queryKeys';
import {
  CreateShoppingItemDto,
  UpdateShoppingItemDto,
  ShoppingItemDto,
  RecordScope,
} from '../../../packages/shared/src';

export function useShoppingList(scope?: RecordScope) {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: queryKeys.shoppingList.list(scope),
    queryFn: () => shoppingListService.getAll(scope),
    refetchInterval: 4000,
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateShoppingItemDto) => shoppingListService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.all });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => shoppingListService.toggle(id),
    onMutate: async (id: string) => {
      // Optimistic update for instant feedback when tapping checkbox
      await queryClient.cancelQueries({ queryKey: queryKeys.shoppingList.all });
      const previous = queryClient.getQueryData<ShoppingItemDto[]>(queryKeys.shoppingList.list(scope));
      if (previous) {
        queryClient.setQueryData<ShoppingItemDto[]>(
          queryKeys.shoppingList.list(scope),
          previous.map((item) =>
            item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
          )
        );
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.shoppingList.list(scope), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateShoppingItemDto }) =>
      shoppingListService.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => shoppingListService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.all });
    },
  });

  const clearCompletedMutation = useMutation({
    mutationFn: () => shoppingListService.clearCompleted(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.all });
    },
  });

  const importSpreadsheetMutation = useMutation({
    mutationFn: (dto: { text?: string; fileBase64?: string; filename?: string; scope?: RecordScope }) =>
      shoppingListService.importSpreadsheet(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.all });
    },
  });

  const allItems = listQuery.data || [];
  const pendingItems = allItems.filter((i) => !i.isCompleted);
  const completedItems = allItems.filter((i) => i.isCompleted);

  return {
    items: allItems,
    pendingItems,
    completedItems,
    isLoading: listQuery.isLoading,
    isRefetching: listQuery.isRefetching,
    isError: listQuery.isError,
    refetch: listQuery.refetch,
    createItem: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    toggleItem: toggleMutation.mutateAsync,
    updateItem: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteItem: deleteMutation.mutateAsync,
    clearCompleted: clearCompletedMutation.mutateAsync,
    isClearing: clearCompletedMutation.isPending,
    importSpreadsheet: importSpreadsheetMutation.mutateAsync,
    isImporting: importSpreadsheetMutation.isPending,
  };
}
