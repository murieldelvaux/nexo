import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiParserService } from './ai-parser.service';

@Module({
  imports: [ConfigModule],
  providers: [AiParserService],
  exports: [AiParserService],
})
export class AiParserModule {}
