import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import { AuthenticatedRequest } from "../types/authenticated";

export async function login(req: Request, res: Response) {
  if (!req.body || !req.body.email || !req.body.password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  const { email, password } = req.body;
  try {
    const token = await authService.login(email, password);
    return res.json({ token });
  } catch (err: any) {
    console.error(err);
    return res
      .status(err.status || 500)
      .json({ message: err.message || "internal error" });
  }
}

export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password required" });
    }

    const user = await authService.register({ email, password, name });

    res.status(201).json(user);
  } catch (err: any) {
    console.error(err);
    return res
      .status(err.status || 500)
      .json({ error: err.message || "internal error" });
  }
}

export async function me(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  return res.json({ user: authReq.user });
}
