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
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    include: {
      columns: {
        orderBy: { position: "asc" },
        include: {
          tasks: {
            orderBy: { position: "asc" },
            include: {
              assignee: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },

      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!board) return null;

  const myMembership = await prisma.boardMember.findUnique({
    where: {
      boardId_userId: { boardId, userId },
    },
    select: { role: true },
  });

  const role = board.ownerId === userId ? "OWNER" : myMembership?.role ?? null;

  return { board, role };
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
