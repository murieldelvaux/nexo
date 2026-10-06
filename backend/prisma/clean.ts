import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clean() {
  console.log('🧹 Limpando todos os registros do banco de dados...');
  await prisma.expense.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.task.deleteMany();
  await prisma.processedWebhookEvent.deleteMany();
  await prisma.user.deleteMany();
  await prisma.household.deleteMany();
  console.log('✨ Banco de dados limpo com sucesso! Todos os registros foram apagados.');
}

clean()
  .catch((e) => {
    console.error('Erro ao limpar banco:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
