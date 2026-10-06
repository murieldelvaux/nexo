import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateGoalDto, UpdateGoalProgressDto, RecordScope, GoalStatus } from '../../../../packages/shared/src';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateGoalDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { householdId: true },
    });

    const isShared = dto.scope === RecordScope.SHARED;

    const goal = await this.prisma.goal.create({
      data: {
        title: dto.title,
        targetAmount: dto.targetAmount,
        currentAmount: dto.currentAmount || 0,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        scope: isShared && user?.householdId ? RecordScope.SHARED : RecordScope.PRIVATE,
        userId,
        householdId: isShared ? user?.householdId : null,
      },
    });

    return this.mapGoal(goal);
  }

  async findAll(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { householdId: true },
    });

    const goals = await this.prisma.goal.findMany({
      where: user?.householdId
        ? {
            OR: [
              { userId, scope: RecordScope.PRIVATE },
              { householdId: user.householdId, scope: RecordScope.SHARED },
            ],
          }
        : { userId },
      orderBy: { createdAt: 'desc' },
    });

    return goals.map(this.mapGoal);
  }

  async addProgress(id: string, userId: string, dto: UpdateGoalProgressDto) {
    const goal = await this.prisma.goal.findUnique({ where: { id } });
    if (!goal) throw new NotFoundException('Meta não encontrada');

    const newCurrent = Number(goal.currentAmount) + dto.amountToAdd;
    const isCompleted = newCurrent >= Number(goal.targetAmount);

    const updated = await this.prisma.goal.update({
      where: { id },
      data: {
        currentAmount: newCurrent,
        status: isCompleted ? GoalStatus.COMPLETED : goal.status,
      },
    });

    return this.mapGoal(updated);
  }

  async delete(id: string) {
    await this.prisma.goal.delete({ where: { id } });
    return { success: true };
  }

  private mapGoal(goal: any) {
    return {
      id: goal.id,
      title: goal.title,
      targetAmount: Number(goal.targetAmount),
      currentAmount: Number(goal.currentAmount),
      targetDate: goal.targetDate ? goal.targetDate.toISOString() : null,
      status: goal.status,
      scope: goal.scope,
      userId: goal.userId,
      householdId: goal.householdId,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    };
  }
}
