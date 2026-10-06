import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTaskDto, RecordScope } from '../../../../packages/shared/src';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateTaskDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { householdId: true },
    });

    const isShared = dto.scope === RecordScope.SHARED;

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        scope: isShared && user?.householdId ? RecordScope.SHARED : RecordScope.PRIVATE,
        userId,
        householdId: isShared ? user?.householdId : null,
      },
    });

    return this.mapTask(task);
  }

  async findAll(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { householdId: true },
    });

    const tasks = await this.prisma.task.findMany({
      where: user?.householdId
        ? {
            OR: [
              { userId, scope: RecordScope.PRIVATE },
              { householdId: user.householdId, scope: RecordScope.SHARED },
            ],
          }
        : { userId },
      orderBy: [{ isCompleted: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    return tasks.map(this.mapTask);
  }

  async toggleComplete(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Lembrete não encontrado');

    const updated = await this.prisma.task.update({
      where: { id },
      data: { isCompleted: !task.isCompleted },
    });

    return this.mapTask(updated);
  }

  async delete(id: string) {
    await this.prisma.task.delete({ where: { id } });
    return { success: true };
  }

  private mapTask(task: any) {
    return {
      id: task.id,
      title: task.title,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      isCompleted: task.isCompleted,
      scope: task.scope,
      userId: task.userId,
      householdId: task.householdId,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }
}
