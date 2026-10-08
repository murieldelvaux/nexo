import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'Nexo Backend API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
