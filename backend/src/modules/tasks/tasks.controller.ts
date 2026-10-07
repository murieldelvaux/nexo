import { Controller, Get, Post, Put, Patch, Delete, Body, Param } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateTaskDto, UpdateTaskDto } from '../../../../packages/shared/src';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(userId, dto);
  }

  @Get()
  async findAll(@CurrentUser('userId') userId: string) {
    return this.tasksService.findAll(userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, userId, dto);
  }

  @Put(':id/toggle')
  async toggleComplete(@Param('id') id: string) {
    return this.tasksService.toggleComplete(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.tasksService.delete(id);
  }
}
