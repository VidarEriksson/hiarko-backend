import { Request, Response } from "express";
import * as tasksService from "../services/tasks.service";
import { AuthenticatedRequest } from "../types/authenticated";

function requireUserId(req: Request): number {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  return userId;
}

function parseColumnId(req: Request): number {
  const id = Number(req.params.columnId);
  if (!Number.isFinite(id))
    throw Object.assign(new Error("Column ID is required"), { status: 400 });
  return id;
}

function parseTaskId(req: Request): number {
  const id = Number(req.params.taskId ?? req.params.id);
  if (!Number.isFinite(id))
    throw Object.assign(new Error("Task ID is required"), { status: 400 });
  return id;
}

export async function createTask(req: Request, res: Response) {
  const userId = requireUserId(req);
  const columnId = parseColumnId(req);

  const title = req.body?.title;
  const description = req.body?.description;

  if (!title || typeof title !== "string") {
    return res.status(400).json({ message: "Task title is required" });
  }

  const task = await tasksService.createForUser(
    userId,
    columnId,
    title,
    description
  );
  res.status(201).json({ task });
}

export async function updateTask(req: Request, res: Response) {
  const userId = requireUserId(req);
  const taskId = parseTaskId(req);

  const payload: any = {};
  if (req.body.title !== undefined) {
    if (typeof req.body.title !== "string")
      return res.status(400).json({ message: "Task title must be a string" });
    payload.title = req.body.title;
  }
  if (req.body.description !== undefined) {
    if (
      req.body.description !== null &&
      typeof req.body.description !== "string"
    )
      return res
        .status(400)
        .json({ message: "Task description must be a string or null" });
    payload.description = req.body.description;
  }
  if (req.body.priority !== undefined) {
    if (!Number.isFinite(req.body.priority))
      return res
        .status(400)
        .json({ message: "Task priority must be a number" });
    payload.priority = Number(req.body.priority);
  }
  if (req.body.assigneeId !== undefined) {
    if (req.body.assigneeId !== null && !Number.isFinite(req.body.assigneeId))
      return res
        .status(400)
        .json({ message: "assigneeId must be an id or null" });
    payload.assigneeId =
      req.body.assigneeId === null ? null : Number(req.body.assigneeId);
  }
  if (req.body.dueDate !== undefined) {
    const v = req.body.dueDate;
    if (v !== null && isNaN(Date.parse(v)))
      return res
        .status(400)
        .json({ message: "dueDate must be a valid date or null" });
    payload.dueDate = v === null ? null : new Date(v);
  }

  const updated = await tasksService.updateForUser(userId, taskId, payload);
  if (updated === null)
    return res.status(404).json({ message: "Task not found" });

  res.json({ task: updated });
}

export async function moveTask(req: Request, res: Response) {
  const userId = requireUserId(req);
  const taskId = parseTaskId(req);

  const columnId = req.body?.columnId;
  const position = req.body?.position;

  if (!Number.isFinite(columnId) || !Number.isFinite(position)) {
    return res
      .status(400)
      .json({ message: "columnId and position are required" });
  }

  const task = await tasksService.moveForUser(
    userId,
    taskId,
    Number(columnId),
    Number(position)
  );
  if (task === null) return res.status(404).json({ message: "Task not found" });

  res.json({ message: "Moved", task });
}

export async function deleteTask(req: Request, res: Response) {
  const userId = requireUserId(req);
  const taskId = parseTaskId(req);

  const result = await tasksService.deleteForUser(userId, taskId);
  if (result === null)
    return res.status(404).json({ message: "Task not found" });

  res.json({ message: "Deleted" });
}
