import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateShoppingItemDto,
  UpdateShoppingItemDto,
  RecordScope,
  ShoppingItemDto,
} from '../../../../packages/shared/src';

@Injectable()
export class ShoppingListService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateShoppingItemDto): Promise<ShoppingItemDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { householdId: true },
    });

    const isShared = dto.scope === RecordScope.SHARED;

    const item = await this.prisma.shoppingItem.create({
      data: {
        name: dto.name.trim(),
        quantity: dto.quantity ? dto.quantity.trim() : '1',
        category: dto.category ? dto.category.trim() : 'Geral',
        scope: isShared && user?.householdId ? RecordScope.SHARED : RecordScope.PRIVATE,
        userId,
        householdId: isShared ? user?.householdId : null,
      },
    });

    return this.mapItem(item);
  }

  async createBatch(
    userId: string,
    items: Array<{ name: string; quantity?: string; category?: string; scope?: RecordScope }>,
  ): Promise<ShoppingItemDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { householdId: true },
    });

    const createdItems: ShoppingItemDto[] = [];

    for (const raw of items) {
      if (!raw.name || !raw.name.trim()) continue;
      const isShared = raw.scope !== RecordScope.PRIVATE;

      const created = await this.prisma.shoppingItem.create({
        data: {
          name: raw.name.trim(),
          quantity: raw.quantity ? raw.quantity.trim() : '1',
          category: raw.category ? raw.category.trim() : 'Geral',
          scope: isShared && user?.householdId ? RecordScope.SHARED : RecordScope.PRIVATE,
          userId,
          householdId: isShared ? user?.householdId : null,
        },
      });
      createdItems.push(this.mapItem(created));
    }

    return createdItems;
  }

  async findAll(userId: string, scope?: RecordScope): Promise<ShoppingItemDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { householdId: true },
    });

    let whereClause: any;

    if (user?.householdId) {
      if (scope === RecordScope.SHARED) {
        whereClause = { householdId: user.householdId, scope: RecordScope.SHARED };
      } else if (scope === RecordScope.PRIVATE) {
        whereClause = { userId, scope: RecordScope.PRIVATE };
      } else {
        whereClause = {
          OR: [
            { userId, scope: RecordScope.PRIVATE },
            { householdId: user.householdId, scope: RecordScope.SHARED },
          ],
        };
      }
    } else {
      whereClause = { userId };
    }

    const items = await this.prisma.shoppingItem.findMany({
      where: whereClause,
      orderBy: [{ isCompleted: 'asc' }, { createdAt: 'desc' }],
    });

    return items.map(this.mapItem);
  }

  async toggleComplete(id: string): Promise<ShoppingItemDto> {
    const item = await this.prisma.shoppingItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item da lista de compras não encontrado');

    const updated = await this.prisma.shoppingItem.update({
      where: { id },
      data: { isCompleted: !item.isCompleted },
    });

    return this.mapItem(updated);
  }

  async update(id: string, dto: UpdateShoppingItemDto): Promise<ShoppingItemDto> {
    const item = await this.prisma.shoppingItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item da lista de compras não encontrado');

    const updated = await this.prisma.shoppingItem.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity ? dto.quantity.trim() : null }),
        ...(dto.category !== undefined && { category: dto.category ? dto.category.trim() : null }),
        ...(dto.isCompleted !== undefined && { isCompleted: dto.isCompleted }),
        ...(dto.scope !== undefined && { scope: dto.scope as any }),
      },
    });

    return this.mapItem(updated);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    await this.prisma.shoppingItem.delete({ where: { id } });
    return { success: true };
  }

  async clearCompleted(userId: string): Promise<{ count: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { householdId: true },
    });

    const whereClause: any = {
      isCompleted: true,
      ...(user?.householdId
        ? {
            OR: [
              { userId, scope: RecordScope.PRIVATE },
              { householdId: user.householdId, scope: RecordScope.SHARED },
            ],
          }
        : { userId }),
    };

    const result = await this.prisma.shoppingItem.deleteMany({
      where: whereClause,
    });

    return { count: result.count };
  }

  private mapItem(item: any): ShoppingItemDto {
    return {
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      category: item.category,
      isCompleted: item.isCompleted,
      scope: item.scope,
      userId: item.userId,
      householdId: item.householdId,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
