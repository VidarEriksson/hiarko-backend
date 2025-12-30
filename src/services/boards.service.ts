import prisma from "../prisma/client";

export async function listForUser(userId: number) {
  return prisma.board.findMany({
    where: { members: { some: { userId } } },
  });
}

export async function createForUser(userId: number, name: string) {
  return prisma.board.create({
    data: {
      name,
      ownerId: userId,
      members: { create: { userId, role: "OWNER" } },
    },
  });
}

export async function getForUser(userId: number, boardId: number) {
  return prisma.board.findFirst({
    where: {
      id: boardId,
      members: { some: { userId } },
    },
  });
}

export async function deleteForUser(userId: number, boardId: number) {
  const board = await prisma.board.findFirst({
    where: { id: boardId, ownerId: userId },
    select: { id: true },
  });

  if (!board) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }

  await prisma.board.delete({ where: { id: boardId } });
}
