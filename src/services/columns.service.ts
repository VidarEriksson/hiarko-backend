import prisma from "../prisma/client";
import * as activityLog from "./activityLog.service";

export async function createForUser(
  userId: number,
  boardId: number,
  name: string
) {
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true },
  });

  if (!board) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }

  const last = await prisma.boardColumn.findFirst({
    where: { boardId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const position = last ? last.position + 1 : 0;

  const column = await prisma.boardColumn.create({
    data: { boardId, name, position },
  });

  await activityLog.create({
    userId,
    action: "CREATE_COLUMN",
    entity: "BoardColumn",
    entityId: column.id,
    details: name,
  });

  return column;
}

export async function updateForUser(
  userId: number,
  columnId: number,
  data: { name?: string }
) {
  const column = await prisma.boardColumn.findUnique({
    where: { id: columnId },
    select: { id: true, boardId: true },
  });
  if (!column) return null;

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

  await prisma.boardColumn.update({ where: { id: columnId }, data });

  const updated = await prisma.boardColumn.findUnique({ where: { id: columnId } });

  await activityLog.create({
    userId,
    action: "UPDATE_COLUMN",
    entity: "BoardColumn",
    entityId: columnId,
    details: data.name,
  });

  return updated;
}

export async function reorderForUser(
  userId: number,
  boardId: number,
  columnIds: number[]
) {
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true },
  });

  if (!board) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }

  const existing = await prisma.boardColumn.findMany({
    where: { boardId },
    select: { id: true },
    orderBy: { position: "asc" },
  });
  const existingIds = existing.map((c) => c.id).sort((a, b) => a - b);
  const incomingIds = [...columnIds].sort((a, b) => a - b);

  if (
    existingIds.length !== incomingIds.length ||
    existingIds.some((v, i) => v !== incomingIds[i])
  ) {
    const err: any = new Error("Invalid column list");
    err.status = 400;
    throw err;
  }

  const updates = columnIds.map((id, index) =>
    prisma.boardColumn.update({ where: { id }, data: { position: index } })
  );

  const result = await prisma.$transaction(updates);

  await activityLog.create({
    userId,
    action: "REORDER_COLUMNS",
    entity: "Board",
    entityId: boardId,
    details: JSON.stringify(columnIds),
  });

  return result;
}

export async function deleteForUser(userId: number, columnId: number) {
  const column = await prisma.boardColumn.findUnique({
    where: { id: columnId },
    select: { id: true, boardId: true },
  });
  if (!column) return null;

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

  await prisma.boardColumn.delete({ where: { id: columnId } });

  await activityLog.create({
    userId,
    action: "DELETE_COLUMN",
    entity: "BoardColumn",
    entityId: columnId,
  });
}
