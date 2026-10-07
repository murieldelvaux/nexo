import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateCalendarEventDto,
  UpdateCalendarEventDto,
} from '../../../../packages/shared/src';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  async findAll(
    @CurrentUser('userId') userId: string,
    @CurrentUser('householdId') householdId: string | null,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.calendarService.findAll(userId, householdId, start, end);
  }

  @Get(':id')
  async findOne(
    @CurrentUser('userId') userId: string,
    @CurrentUser('householdId') householdId: string | null,
    @Param('id') id: string,
  ) {
    return this.calendarService.findOne(id, userId, householdId);
  }

  @Post()
  async create(
    @CurrentUser('userId') userId: string,
    @CurrentUser('householdId') householdId: string | null,
    @Body() dto: CreateCalendarEventDto,
  ) {
    return this.calendarService.create(userId, householdId, dto);
  }

  @Put(':id')
  async update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCalendarEventDto,
  ) {
    return this.calendarService.update(userId, id, dto);
  }

  @Delete(':id')
  async delete(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.calendarService.delete(userId, id);
  }

  @Post('sync-google')
  async syncWithGoogle(
    @CurrentUser('userId') userId: string,
    @CurrentUser('householdId') householdId: string | null,
  ) {
    return this.calendarService.syncWithGoogle(userId, householdId);
  }
}
