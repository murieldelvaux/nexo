import { Controller, Get, Post, Body } from '@nestjs/common';
import { HouseholdService } from './household.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateHouseholdDto, JoinHouseholdDto } from '../../../../packages/shared/src';

@Controller('household')
export class HouseholdController {
  constructor(private readonly householdService: HouseholdService) {}

  @Get('current')
  async getCurrent(@CurrentUser('userId') userId: string) {
    return this.householdService.getHousehold(userId);
  }

  @Post('create')
  async create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateHouseholdDto,
  ) {
    return this.householdService.create(userId, dto);
  }

  @Post('join')
  async join(
    @CurrentUser('userId') userId: string,
    @Body() dto: JoinHouseholdDto,
  ) {
    return this.householdService.join(userId, dto);
  }
}
