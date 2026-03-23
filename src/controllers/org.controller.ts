import { Request, Response } from "express";
import * as orgService from "../services/org.service";
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

export async function listOrgs(req: Request, res: Response) {
  const userId = requireUserId(req);
  const orgs = await orgService.listForUser(userId);
  res.json({ orgs });
}

export async function createOrg(req: Request, res: Response) {
  const userId = requireUserId(req);
  const name = req.body?.name;
  if (!name || typeof name !== "string")
    return res.status(400).json({ message: "Organization name is required" });

  const org = await orgService.create(userId, name);
  res.status(201).json({ org });
}

export async function getOrg(req: Request, res: Response) {
  const userId = requireUserId(req);
  const orgId = parseOrgId(req);

  const result = await orgService.getForMember(userId, orgId);
  res.json(result);
}

export async function deleteOrg(req: Request, res: Response) {
  const userId = requireUserId(req);
  const orgId = parseOrgId(req);

  await orgService.deleteOrg(userId, orgId);
  res.json({ message: "Deleted" });
}

export async function addMember(req: Request, res: Response) {
  const userId = requireUserId(req);
  const orgId = parseOrgId(req);
  const targetUserId = Number(req.body?.userId);
  const role = req.body?.role;

  if (!Number.isFinite(targetUserId))
    return res.status(400).json({ message: "userId is required" });
  if (role && role !== "ADMIN" && role !== "MEMBER")
    return res.status(400).json({ message: "role must be ADMIN or MEMBER" });

  const member = await orgService.addMember(userId, orgId, targetUserId, role);
  res.status(201).json({ member });
}

export async function removeMember(req: Request, res: Response) {
  const userId = requireUserId(req);
  const orgId = parseOrgId(req);
  const targetUserId = Number(req.params.userId);

  if (!Number.isFinite(targetUserId))
    return res.status(400).json({ message: "userId is required" });

  await orgService.removeMember(userId, orgId, targetUserId);
  res.json({ message: "Removed" });
}

export async function updateMemberRole(req: Request, res: Response) {
  const userId = requireUserId(req);
  const orgId = parseOrgId(req);
  const targetUserId = Number(req.params.userId);
  const role = req.body?.role;

  if (!Number.isFinite(targetUserId))
    return res.status(400).json({ message: "userId is required" });
  if (role !== "ADMIN" && role !== "MEMBER")
    return res.status(400).json({ message: "role must be ADMIN or MEMBER" });

  const member = await orgService.updateMemberRole(
    userId,
    orgId,
    targetUserId,
    role
  );
  res.json({ member });
}

export async function createOrgBoard(req: Request, res: Response) {
  const userId = requireUserId(req);
  const orgId = parseOrgId(req);
  const name = req.body?.name;

  if (!name || typeof name !== "string")
    return res.status(400).json({ message: "Board name is required" });

  const board = await orgService.createBoard(userId, orgId, name);
  res.status(201).json({ board });
}
