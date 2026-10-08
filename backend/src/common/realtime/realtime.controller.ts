import {
  Controller,
  Sse,
  Query,
  Headers,
  MessageEvent,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Observable, interval, merge } from 'rxjs';
import { map } from 'rxjs/operators';
import { JwtService } from '@nestjs/jwt';
import { RealtimeService } from './realtime.service';
import { Public } from '../decorators/public.decorator';

@Controller('realtime')
export class RealtimeController {
  private readonly logger = new Logger(RealtimeController.name);

  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly jwtService: JwtService,
  ) {}

  @Public()
  @Sse('sse')
  sse(
    @Query('token') queryToken?: string,
    @Headers('authorization') authHeader?: string,
  ): Observable<MessageEvent> {
    const token = queryToken || (authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null);
    if (!token) {
      throw new UnauthorizedException('Token de autenticação não fornecido para o stream em tempo real');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch (err: any) {
      this.logger.warn(`Falha na autenticação do SSE: ${err?.message}`);
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    const userId = payload.sub || payload.userId;
    const householdId = payload.householdId || null;

    this.logger.log(`[Realtime SSE] Cliente conectado: user=${userId}, household=${householdId}`);

    // Heartbeat ping a cada 20 segundos para manter conexões abertas em proxies e no Render
    const heartbeat$ = interval(20000).pipe(
      map(() => ({
        data: JSON.stringify({ type: 'HEARTBEAT', timestamp: new Date().toISOString() }),
      } as MessageEvent)),
    );

    const userEvents$ = this.realtimeService.getEvents(userId, householdId);

    return merge(userEvents$, heartbeat$);
  }
}
