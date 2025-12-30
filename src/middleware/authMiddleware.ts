import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/authenticated";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && (authHeader as string).split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    const payload = user as { id: number; email: string; name?: string };
    (req as AuthenticatedRequest).user = payload;
    next();
  });
};
