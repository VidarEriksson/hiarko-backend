import { Request, Response } from "express";
import * as columnsService from "../services/columns.service";
import { AuthenticatedRequest } from "../types/authenticated";

function requireUserId(req: Request): number {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  return userId;
}

function parseBoardId(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isFinite(id))
    throw Object.assign(new Error("Board ID is required"), { status: 400 });
  return id;
}

function parseColumnId(req: Request): number {
  const id = Number(req.params.columnId ?? req.params.id);
  if (!Number.isFinite(id))
    throw Object.assign(new Error("Column ID is required"), { status: 400 });
  return id;
}

export async function createColumn(req: Request, res: Response) {
  const userId = requireUserId(req);
  const boardId = parseBoardId(req);

  const name = req.body?.name;
  if (!name || typeof name !== "string") {
    return res.status(400).json({ message: "Column name is required" });
  }

  const column = await columnsService.createForUser(userId, boardId, name);
  res.status(201).json({ column });
}

export async function updateColumn(req: Request, res: Response) {
  const userId = requireUserId(req);
  const columnId = parseColumnId(req);

  const name = req.body?.name;
  if (name !== undefined && typeof name !== "string") {
    return res.status(400).json({ message: "Column name must be a string" });
  }

  const column = await columnsService.updateForUser(userId, columnId, { name });

  if (column === null) return res.status(404).json({ message: "Column not found" });

  res.json({ column });
}

export async function reorderColumns(req: Request, res: Response) {
  const userId = requireUserId(req);
  const boardId = parseBoardId(req);

  const columnIds = req.body?.columnIds;
  if (!Array.isArray(columnIds) || !columnIds.every((v: any) => Number.isFinite(v))) {
    return res.status(400).json({ message: "columnIds must be an array of ids" });
  }

  await columnsService.reorderForUser(userId, boardId, columnIds);
  res.json({ message: "Reordered" });
}

export async function deleteColumn(req: Request, res: Response) {
  const userId = requireUserId(req);
  const columnId = parseColumnId(req);

  const result = await columnsService.deleteForUser(userId, columnId);
  if (result === null) return res.status(404).json({ message: "Column not found" });

  res.json({ message: "Deleted" });
}
