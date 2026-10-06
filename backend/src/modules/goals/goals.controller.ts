import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateGoalDto, UpdateGoalProgressDto } from '../../../../packages/shared/src';

@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  async create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateGoalDto,
  ) {
    return this.goalsService.create(userId, dto);
  }

  @Get()
  async findAll(@CurrentUser('userId') userId: string) {
    return this.goalsService.findAll(userId);
  }

  @Post(':id/progress')
  async addProgress(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateGoalProgressDto,
  ) {
    return this.goalsService.addProgress(id, userId, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.goalsService.delete(id);
  }
}
