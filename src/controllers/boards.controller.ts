import { Request, Response } from "express";
import * as boardsService from "../services/boards.service";
import { AuthenticatedRequest } from "../types/authenticated";

function requireUserId(req: Request): number {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  return userId;
}

function parseBoardId(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw Object.assign(new Error("Board ID is required"), { status: 400 });
  return id;
}

export async function listBoards(req: Request, res: Response) {
  const userId = requireUserId(req);
  const boards = await boardsService.listForUser(userId);
  res.json({ boards });
}

export async function createBoard(req: Request, res: Response) {
  const userId = requireUserId(req);

  const name = req.body?.name;
  if (!name || typeof name !== "string") {
    return res.status(400).json({ message: "Board name is required" });
  }

  const board = await boardsService.createForUser(userId, name);
  res.status(201).json({ board });
}

export async function getBoard(req: Request, res: Response) {
  const userId = requireUserId(req);
  const boardId = parseBoardId(req);

  const board = await boardsService.getForUser(userId, boardId);
  if (!board) return res.status(404).json({ message: "Board not found" });

  res.json({ board });
}

export async function deleteBoard(req: Request, res: Response) {
  const userId = requireUserId(req);
  const boardId = parseBoardId(req);

  await boardsService.deleteForUser(userId, boardId);

  res.json({ message: "Deleted" });
}
