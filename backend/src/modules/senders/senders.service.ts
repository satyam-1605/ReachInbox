import { prisma } from "../../config/db.js";

export async function getDefaultUserAndSender() {
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "demo@reachinbox.ai",
        name: "ReachInbox Demo User",
      },
    });
  }

  let sender = await prisma.sender.findFirst({
    where: { userId: user.id },
  });

  if (!sender) {
    sender = await prisma.sender.create({
      data: {
        userId: user.id,
        name: "Default ReachInbox Sender",
        email: "sender@ethereal.email",
      },
    });
  }

  return { user, sender };
}

export async function getSenders(userId?: string) {
  if (userId) {
    return prisma.sender.findMany({ where: { userId } });
  }
  return prisma.sender.findMany();
}

