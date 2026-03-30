import { Request, Response } from "express";
import * as viewsService from "../services/views.service";
import { AuthenticatedRequest } from "../types/authenticated";

function requireUserId(req: Request): number {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  return userId;
}

function parseOrgId(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isFinite(id))
    throw Object.assign(new Error("Org ID is required"), { status: 400 });
  return id;
}

function parseViewId(req: Request): number {
  const id = Number(req.params.viewId);
  if (!Number.isFinite(id))
    throw Object.assign(new Error("View ID is required"), { status: 400 });
  return id;
}

export async function listViews(req: Request, res: Response) {
  const userId = requireUserId(req);
  const orgId = parseOrgId(req);
  const views = await viewsService.listViews(userId, orgId);
  res.json({ views });
}

export async function createView(req: Request, res: Response) {
  const userId = requireUserId(req);
  const orgId = parseOrgId(req);
  const { name, config } = req.body;

  if (!name || typeof name !== "string")
    return res.status(400).json({ message: "name is required" });
  if (!config || typeof config !== "object" || Array.isArray(config))
    return res.status(400).json({ message: "config is required" });

  const view = await viewsService.createView(userId, orgId, name, config);
  res.status(201).json({ view });
}

export async function getView(req: Request, res: Response) {
  const userId = requireUserId(req);
  const orgId = parseOrgId(req);
  const viewId = parseViewId(req);
  const view = await viewsService.getView(userId, orgId, viewId);
  res.json({ view });
}

export async function updateView(req: Request, res: Response) {
  const userId = requireUserId(req);
  const orgId = parseOrgId(req);
  const viewId = parseViewId(req);
  const { name, config } = req.body;

  if (name !== undefined && typeof name !== "string")
    return res.status(400).json({ message: "name must be a string" });
  if (
    config !== undefined &&
    (typeof config !== "object" || Array.isArray(config))
  )
    return res.status(400).json({ message: "config must be an object" });

  const view = await viewsService.updateView(userId, orgId, viewId, {
    name,
    config,
  });
  res.json({ view });
}

export async function deleteView(req: Request, res: Response) {
  const userId = requireUserId(req);
  const orgId = parseOrgId(req);
  const viewId = parseViewId(req);
  await viewsService.deleteView(userId, orgId, viewId);
  res.json({ message: "Deleted" });
}

export async function executeView(req: Request, res: Response) {
  const userId = requireUserId(req);
  const orgId = parseOrgId(req);
  const viewId = parseViewId(req);
  const result = await viewsService.executeView(userId, orgId, viewId);
  res.json(result);
}
