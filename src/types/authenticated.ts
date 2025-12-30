import { Request } from "express";

export interface UserPayload {
  id: number;
  email?: string;
  name?: string;
}

export interface AuthenticatedRequest extends Request {
  user: UserPayload;
}
