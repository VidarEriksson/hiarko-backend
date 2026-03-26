import { Request, Response } from "express";
import * as orgService from "../services/org.service";
import { AuthenticatedRequest } from "../types/authenticated";

function requireUserId(req: Request): number {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  return userId;
}

export async function getInvite(req: Request, res: Response) {
  const { token } = req.params;
  if (!token) return res.status(400).json({ message: "Token is required" });
  const invite = await orgService.getInvite(token);
  res.json({ invite });
}

export async function acceptInvite(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { token } = req.params;
  if (!token) return res.status(400).json({ message: "Token is required" });
  const org = await orgService.acceptInvite(userId, token);
  res.json({ org });
}

export async function declineInvite(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { token } = req.params;
  if (!token) return res.status(400).json({ message: "Token is required" });
  await orgService.declineInvite(userId, token);
  res.json({ message: "Declined" });
}
