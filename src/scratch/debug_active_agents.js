import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const activeAgents = await prisma.task_agents.findMany({
    where: {
      agent_status: { in: ['accepted', 'picked_up'] }
    },
    include: {
      task: true,
      staff: true
    }
  });
  console.log(JSON.stringify(activeAgents, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
