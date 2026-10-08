import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { DailyBriefingService } from './daily-briefing.service';
import { DatabaseModule } from '../../database/database.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [DatabaseModule, WhatsappModule],
  controllers: [CalendarController],
  providers: [CalendarService, DailyBriefingService],
  exports: [CalendarService, DailyBriefingService],
})
export class CalendarModule {}
