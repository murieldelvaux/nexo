import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('webhooks/whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const expectedToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN');
    if (mode === 'subscribe' && token === expectedToken) {
      this.logger.log('WhatsApp Webhook successfully verified by Meta');
      return res.status(HttpStatus.OK).send(challenge);
    }
    return res.status(HttpStatus.FORBIDDEN).send('Token de verificação incorreto');
  }

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleIncomingMessage(
    @Req() req: Request,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    const appSecret = this.configService.get<string>('WHATSAPP_APP_SECRET');

    // Validação de assinatura criptográfica se configurado
    if (signature && appSecret && appSecret !== 'your_meta_app_secret_here') {
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      const hmac = crypto.createHmac('sha256', appSecret);
      const digest = 'sha256=' + hmac.update(rawBody).digest('hex');

      if (signature !== digest) {
        this.logger.warn('Assinatura inválida no Webhook do WhatsApp');
        throw new BadRequestException('Assinatura do webhook inválida');
      }
    }

    const body = req.body;
    if (body.object === 'whatsapp_business_account') {
      // Processa o evento
      this.whatsappService.processEvent(body).catch((err) => {
        this.logger.error('Erro assíncrono ao processar evento do WhatsApp', err);
      });
    }

    return { status: 'EVENT_RECEIVED' };
  }
}
