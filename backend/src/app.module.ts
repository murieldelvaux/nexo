import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { MailModule } from './modules/mail/mail.module';
import { HouseholdModule } from './modules/household/household.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { GoalsModule } from './modules/goals/goals.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { AiParserModule } from './modules/ai-parser/ai-parser.module';
import { ShoppingListModule } from './modules/shopping-list/shopping-list.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env', '../../.env'],
    }),
    DatabaseModule,
    MailModule,
    AuthModule,
    HouseholdModule,
    ExpensesModule,
    GoalsModule,
    TasksModule,
    WhatsappModule,
    AiParserModule,
    ShoppingListModule,
    CalendarModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
