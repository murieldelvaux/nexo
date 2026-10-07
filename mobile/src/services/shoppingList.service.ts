import { apiClient } from './api';
import {
  CreateShoppingItemDto,
  UpdateShoppingItemDto,
  ShoppingItemDto,
  RecordScope,
} from '../../../packages/shared/src';

export const shoppingListService = {
  async getAll(scope?: RecordScope): Promise<ShoppingItemDto[]> {
    const { data } = await apiClient.get<ShoppingItemDto[]>('/shopping-list', {
      params: { scope },
    });
    return data;
  },

  async create(dto: CreateShoppingItemDto): Promise<ShoppingItemDto> {
    const { data } = await apiClient.post<ShoppingItemDto>('/shopping-list', dto);
    return data;
  },

  async createBatch(items: Array<{ name: string; quantity?: string; category?: string; scope?: RecordScope }>): Promise<ShoppingItemDto[]> {
    const { data } = await apiClient.post<ShoppingItemDto[]>('/shopping-list/batch', { items });
    return data;
  },

  async toggle(id: string): Promise<ShoppingItemDto> {
    const { data } = await apiClient.patch<ShoppingItemDto>(`/shopping-list/${id}/toggle`);
    return data;
  },

  async update(id: string, dto: UpdateShoppingItemDto): Promise<ShoppingItemDto> {
    const { data } = await apiClient.put<ShoppingItemDto>(`/shopping-list/${id}`, dto);
    return data;
  },

  async delete(id: string): Promise<{ success: boolean }> {
    const { data } = await apiClient.delete<{ success: boolean }>(`/shopping-list/${id}`);
    return data;
  },

  async clearCompleted(): Promise<{ count: number }> {
    const { data } = await apiClient.delete<{ count: number }>('/shopping-list/completed');
    return data;
  },
};
