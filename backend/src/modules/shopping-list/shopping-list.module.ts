import { Module } from '@nestjs/common';
import { ShoppingListService } from './shopping-list.service';
import { ShoppingListController } from './shopping-list.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ShoppingListController],
  providers: [ShoppingListService],
  exports: [ShoppingListService],
})
export class ShoppingListModule {}
