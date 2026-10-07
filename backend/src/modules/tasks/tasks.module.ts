import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskReminderService } from './task-reminder.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [WhatsappModule],
  controllers: [TasksController],
  providers: [TasksService, TaskReminderService],
  exports: [TasksService],
})
export class TasksModule {}
