import prisma from "../prisma/client";

export async function createForUser(
  userId: number,
  columnId: number,
  title: string,
  description?: string
) {
  const column = await prisma.boardColumn.findUnique({
    where: { id: columnId },
    select: { id: true, boardId: true },
  });
  if (!column) {
    const err: any = new Error("Column not found");
    err.status = 404;
    throw err;
  }

  const board = await prisma.board.findFirst({
    where: {
      id: column.boardId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true },
  });

  if (!board) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }

  const last = await prisma.task.findFirst({
    where: { columnId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const position = last ? last.position + 1 : 0;

  const data: any = {
    columnId,
    boardId: column.boardId,
    title,
    position,
    createdById: userId,
  };
  if (description !== undefined) data.description = description;

  return prisma.task.create({ data });
}

export async function updateForUser(
  userId: number,
  taskId: number,
  data: {
    title?: string;
    description?: string;
    priority?: number;
    assigneeId?: number | null;
    dueDate?: Date | null;
  }
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, boardId: true },
  });
  if (!task) return null;

  const board = await prisma.board.findFirst({
    where: {
      id: task.boardId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true },
  });

  if (!board) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }

  await prisma.task.update({ where: { id: taskId }, data });

  return prisma.task.findUnique({ where: { id: taskId } });
}

export async function moveForUser(
  userId: number,
  taskId: number,
  toColumnId: number,
  toPosition: number
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, columnId: true, position: true, boardId: true },
  });
  if (!task) return null;

  const board = await prisma.board.findFirst({
    where: {
      id: task.boardId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true },
  });

  if (!board) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }

  const targetColumn = await prisma.boardColumn.findUnique({
    where: { id: toColumnId },
    select: { id: true, boardId: true },
  });
  if (!targetColumn || targetColumn.boardId !== task.boardId) {
    const err: any = new Error("Invalid target column");
    err.status = 400;
    throw err;
  }

  const fromColumnId = task.columnId;
  const fromPos = task.position;

  if (toPosition < 0) {
    const err: any = new Error("Invalid position");
    err.status = 400;
    throw err;
  }

  const targetCount = await prisma.task.count({
    where: { columnId: toColumnId },
  });
  if (toPosition > targetCount) {
    const err: any = new Error("Invalid position");
    err.status = 400;
    throw err;
  }

  if (fromColumnId === toColumnId) {
    if (toPosition === fromPos)
      return prisma.task.findUnique({ where: { id: taskId } });

    if (toPosition < fromPos) {
      await prisma.$transaction([
        prisma.task.updateMany({
          where: {
            columnId: fromColumnId,
            position: { gte: toPosition, lt: fromPos },
          },
          data: { position: { increment: 1 } },
        }),
        prisma.task.update({
          where: { id: taskId },
          data: { position: toPosition },
        }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.task.updateMany({
          where: {
            columnId: fromColumnId,
            position: { gt: fromPos, lte: toPosition },
          },
          data: { position: { decrement: 1 } },
        }),
        prisma.task.update({
          where: { id: taskId },
          data: { position: toPosition },
        }),
      ]);
    }
  } else {
    await prisma.$transaction([
      prisma.task.updateMany({
        where: { columnId: fromColumnId, position: { gt: fromPos } },
        data: { position: { decrement: 1 } },
      }),
      prisma.task.updateMany({
        where: { columnId: toColumnId, position: { gte: toPosition } },
        data: { position: { increment: 1 } },
      }),
      prisma.task.update({
        where: { id: taskId },
        data: { columnId: toColumnId, position: toPosition },
      }),
    ]);
  }

  return prisma.task.findUnique({ where: { id: taskId } });
}

export async function deleteForUser(userId: number, taskId: number) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, columnId: true, position: true, boardId: true },
  });
  if (!task) return null;

  const board = await prisma.board.findFirst({
    where: {
      id: task.boardId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true },
  });

  if (!board) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }

  await prisma.$transaction([
    prisma.task.delete({ where: { id: taskId } }),
    prisma.task.updateMany({
      where: { columnId: task.columnId, position: { gt: task.position } },
      data: { position: { decrement: 1 } },
    }),
  ]);
}
