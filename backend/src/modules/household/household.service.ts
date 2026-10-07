import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateHouseholdDto, JoinHouseholdDto } from '../../../../packages/shared/src';

@Injectable()
export class HouseholdService {
  constructor(private prisma: PrismaService) { }

  async create(userId: string, dto: CreateHouseholdDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const inviteCode = 'NEXO-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    const household = await this.prisma.household.create({
      data: {
        name: dto.name || 'Nossa Casa',
        inviteCode,
        members: {
          connect: { id: userId },
        },
      },
      include: {
        members: {
          select: { id: true, name: true, email: true, phoneNumber: true },
        },
      },
    });

    return household;
  }

  async join(userId: string, dto: JoinHouseholdDto) {
    const household = await this.prisma.household.findUnique({
      where: { inviteCode: dto.inviteCode.trim().toUpperCase() },
      include: { members: true },
    });

    if (!household) {
      throw new NotFoundException('Espaço não encontrado com este código');
    }

    if (household.members.length >= 2) {
      // No MVP o casal é limitado a 2 membros
      const isAlreadyMember = household.members.some((m: any) => m.id === userId);
      if (!isAlreadyMember) {
        throw new BadRequestException('Este espaço já possui 2 membros cadastrados');
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { householdId: household.id },
    });

    return this.getHousehold(userId);
  }

  async getHousehold(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        household: {
          include: {
            members: {
              select: { id: true, name: true, email: true, phoneNumber: true },
            },
          },
        },
      },
    });

    if (!user?.household) {
      return null;
    }

    return user.household;
  }
}
