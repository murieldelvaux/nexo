import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateCalendarEventDto,
  UpdateCalendarEventDto,
  RecordScope,
} from '../../../../packages/shared/src';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(
    userId: string,
    householdId: string | null,
    start?: string,
    end?: string,
  ) {
    const whereClause: any = {
      OR: [
        { userId },
        ...(householdId ? [{ householdId, scope: RecordScope.SHARED }] : []),
      ],
    };

    if (start || end) {
      whereClause.AND = [];
      if (start) {
        whereClause.AND.push({
          OR: [
            { startDate: { gte: new Date(start) } },
            { endDate: { gte: new Date(start) } },
          ],
        });
      }
      if (end) {
        whereClause.AND.push({
          startDate: { lte: new Date(end) },
        });
      }
    }

    return this.prisma.calendarEvent.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async findOne(id: string, userId: string, householdId: string | null) {
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }

    const isOwner = event.userId === userId;
    const isHouseholdShared =
      householdId && event.householdId === householdId && event.scope === RecordScope.SHARED;

    if (!isOwner && !isHouseholdShared) {
      throw new NotFoundException('Evento não encontrado');
    }

    return event;
  }

  async create(userId: string, householdId: string | null, dto: CreateCalendarEventDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isShared = dto.scope === RecordScope.SHARED && !!householdId;

    let googleEventId: string | null = null;

    // Se o usuário possui token do Google Calendar configurado, sincroniza com o Google Calendar
    if (user?.googleAccessToken) {
      try {
        googleEventId = await this.pushToGoogleCalendar(user.googleAccessToken, {
          title: dto.title,
          description: dto.description,
          startDate: new Date(dto.startDate),
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          isAllDay: dto.isAllDay,
          location: dto.location,
        });
      } catch (err: any) {
        this.logger.warn(`Falha ao exportar evento para o Google Agenda: ${err?.message || err}`);
      }
    }

    return this.prisma.calendarEvent.create({
      data: {
        title: dto.title,
        description: dto.description || null,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        isAllDay: !!dto.isAllDay,
        location: dto.location || null,
        scope: isShared ? RecordScope.SHARED : RecordScope.PRIVATE,
        userId,
        householdId: isShared ? householdId : null,
        googleEventId,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateCalendarEventDto) {
    const existing = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Evento não encontrado');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    let googleEventId = existing.googleEventId;

    if (user?.googleAccessToken) {
      const eventDetails = {
        title: dto.title || existing.title,
        description: dto.description !== undefined ? (dto.description || undefined) : (existing.description || undefined),
        startDate: dto.startDate ? new Date(dto.startDate) : existing.startDate,
        endDate: dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : undefined) : (existing.endDate || undefined),
        isAllDay: dto.isAllDay !== undefined ? dto.isAllDay : existing.isAllDay,
        location: dto.location !== undefined ? (dto.location || undefined) : (existing.location || undefined),
      };

      if (googleEventId && !googleEventId.startsWith('dev_event_')) {
        try {
          await this.updateGoogleCalendarEvent(
            user.googleAccessToken,
            googleEventId,
            eventDetails,
          );
        } catch (err: any) {
          this.logger.warn(`Falha ao atualizar evento no Google Agenda: ${err?.message || err}`);
        }
      } else {
        // Se ainda não tinha googleEventId no Google Agenda, cria agora
        try {
          const newGId = await this.pushToGoogleCalendar(user.googleAccessToken, eventDetails);
          if (newGId) {
            googleEventId = newGId;
          }
        } catch (err: any) {
          this.logger.warn(`Falha ao exportar evento atualizado para Google Agenda: ${err?.message || err}`);
        }
      }
    }

    return this.prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.isAllDay !== undefined && { isAllDay: dto.isAllDay }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.scope && { scope: dto.scope }),
        ...(googleEventId && { googleEventId }),
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async delete(userId: string, id: string) {
    const existing = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Evento não encontrado');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (existing.googleEventId && user?.googleAccessToken) {
      try {
        await this.deleteGoogleCalendarEvent(user.googleAccessToken, existing.googleEventId);
      } catch (err: any) {
        this.logger.warn(`Falha ao excluir evento do Google Agenda: ${err?.message || err}`);
      }
    }

    return this.prisma.calendarEvent.delete({ where: { id } });
  }

  // Sincronização bidirecional completa com Google Agenda
  async syncWithGoogle(userId: string, householdId: string | null) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.googleAccessToken) {
      return {
        success: false,
        needsConnect: true,
        message: 'Conta Google não vinculada ou sem permissão de agenda. Clique em "Conectar Google Agenda".',
        eventsSynced: 0,
      };
    }

    if (user.googleAccessToken.startsWith("dev_token_") || user.googleAccessToken.startsWith("AIzaSy")) {
      return {
        success: true,
        message: 'Google Agenda conectado e sincronizado em modo de testes!',
        importedFromGoogle: 0,
        exportedToGoogle: 0,
      };
    }

    try {
      // 1. Puxar eventos dos últimos 30 dias e próximos 90 dias do Google Calendar
      const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

      const { data: gcalData } = await axios.get(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          headers: { Authorization: `Bearer ${user.googleAccessToken}` },
          params: {
            timeMin,
            timeMax,
            singleEvents: true,
            maxResults: 250,
          },
        },
      );

      let importedCount = 0;
      const items = gcalData?.items || [];

      for (const item of items) {
        if (!item.summary || item.status === 'cancelled') continue;

        const isAllDay = !!item.start?.date;
        const startDate = item.start?.dateTime
          ? new Date(item.start.dateTime)
          : item.start?.date
          ? new Date(item.start.date + 'T00:00:00Z')
          : new Date();

        const endDate = item.end?.dateTime
          ? new Date(item.end.dateTime)
          : item.end?.date
          ? new Date(item.end.date + 'T23:59:59Z')
          : null;

        const existing = await this.prisma.calendarEvent.findFirst({
          where: { googleEventId: item.id },
        });

        if (!existing) {
          await this.prisma.calendarEvent.create({
            data: {
              title: item.summary,
              description: item.description || null,
              location: item.location || null,
              startDate,
              endDate,
              isAllDay,
              googleEventId: item.id,
              scope: RecordScope.PRIVATE,
              userId,
              householdId: null,
            },
          });
          importedCount++;
        } else {
          // Atualiza dados caso tenham mudado
          await this.prisma.calendarEvent.update({
            where: { id: existing.id },
            data: {
              title: item.summary,
              description: item.description || null,
              location: item.location || null,
              startDate,
              endDate,
              isAllDay,
            },
          });
        }
      }

      // 2. Exportar eventos criados localmente no Nexo que ainda não têm googleEventId
      const localEventsWithoutGoogle = await this.prisma.calendarEvent.findMany({
        where: {
          userId,
          googleEventId: null,
        },
      });

      let exportedCount = 0;
      for (const localEv of localEventsWithoutGoogle) {
        try {
          const gId = await this.pushToGoogleCalendar(user.googleAccessToken, {
            title: localEv.title,
            description: localEv.description || undefined,
            startDate: localEv.startDate,
            endDate: localEv.endDate || undefined,
            isAllDay: localEv.isAllDay,
            location: localEv.location || undefined,
          });

          if (gId) {
            await this.prisma.calendarEvent.update({
              where: { id: localEv.id },
              data: { googleEventId: gId },
            });
            exportedCount++;
          }
        } catch (e) {
          // segue para os próximos
        }
      }

      return {
        success: true,
        message: 'Sincronização concluída com sucesso!',
        importedFromGoogle: importedCount,
        exportedToGoogle: exportedCount,
      };
    } catch (err: any) {
      const gError = err?.response?.data?.error;
      const errorMsg = gError?.message || err?.message || '';
      this.logger.error(`Erro ao sincronizar com Google Calendar: ${errorMsg}`);

      if (errorMsg.includes("has not been used in project") || errorMsg.includes("disabled") || gError?.details?.[0]?.reason === "SERVICE_DISABLED") {
        const activationUrl = "https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=163978455295";
        return {
          success: false,
          needsActivation: true,
          activationUrl,
          message: `A Google Calendar API está desativada no seu Google Cloud. Clique para ativar: ${activationUrl}`,
          error: errorMsg,
        };
      }

      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        return {
          success: false,
          needsConnect: true,
          message: 'Permissão da agenda pendente ou expirada. Clique em "Conectar Google Agenda".',
          error: errorMsg,
        };
      }
      return {
        success: false,
        message: 'Não foi possível sincronizar com o Google Agenda. Verifique as permissões de acesso.',
        error: errorMsg,
      };
    }
  }

  // Helpers do Google Calendar API
  private async pushToGoogleCalendar(
    token: string,
    eventData: {
      title: string;
      description?: string;
      startDate: Date;
      endDate?: Date;
      isAllDay?: boolean;
      location?: string;
    },
  ): Promise<string | null> {
    const body: any = {
      summary: eventData.title,
      description: eventData.description || '',
      location: eventData.location || '',
    };

    if (eventData.isAllDay) {
      const dateStr = eventData.startDate.toISOString().slice(0, 10);
      body.start = { date: dateStr };
      const endDate = eventData.endDate || eventData.startDate;
      body.end = { date: endDate.toISOString().slice(0, 10) };
    } else {
      body.start = { dateTime: eventData.startDate.toISOString() };
      const endDate =
        eventData.endDate ||
        new Date(eventData.startDate.getTime() + 60 * 60 * 1000);
      body.end = { dateTime: endDate.toISOString() };
    }

    if (token.startsWith("dev_token_") || token.startsWith("AIzaSy")) {
      return "dev_event_" + Date.now();
    }

    const res = await axios.post(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      body,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return res.data?.id || null;
  }

  private async updateGoogleCalendarEvent(
    token: string,
    googleEventId: string,
    eventData: {
      title: string;
      description?: string;
      startDate: Date;
      endDate?: Date;
      isAllDay?: boolean;
      location?: string;
    },
  ) {
    const body: any = {
      summary: eventData.title,
      description: eventData.description || '',
      location: eventData.location || '',
    };

    if (eventData.isAllDay) {
      const dateStr = eventData.startDate.toISOString().slice(0, 10);
      body.start = { date: dateStr };
      const endDate = eventData.endDate || eventData.startDate;
      body.end = { date: endDate.toISOString().slice(0, 10) };
    } else {
      body.start = { dateTime: eventData.startDate.toISOString() };
      const endDate =
        eventData.endDate ||
        new Date(eventData.startDate.getTime() + 60 * 60 * 1000);
      body.end = { dateTime: endDate.toISOString() };
    }

    await axios.put(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
      body,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  private async deleteGoogleCalendarEvent(token: string, googleEventId: string) {
    if (token.startsWith("dev_token_") || token.startsWith("AIzaSy")) {
      return;
    }
    await axios.delete(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  }
}
