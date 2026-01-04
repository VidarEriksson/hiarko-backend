import { Request, Response } from "express";
import jwt from "jsonwebtoken";

jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
}));

import { authenticateToken } from "../../src/middleware/authMiddleware";
import { AuthenticatedRequest } from "../../src/types/authenticated";

describe("authenticateToken middleware", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    (jwt.verify as jest.Mock).mockReset();
  });

  it("should return 401 if no token is provided", () => {
    authenticateToken(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Access token required" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 403 if token is invalid", () => {
    req.headers = { authorization: "Bearer invalidtoken" };
    (jwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
      callback(new Error("Invalid token"), null);
    });

    authenticateToken(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid or expired token",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next() and attach user to req if token is valid", () => {
    req.headers = { authorization: "Bearer validtoken" };
    const mockUser = { id: 1, email: "test@example.com" };
    (jwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
      callback(null, mockUser);
    });

    authenticateToken(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    const RequestWithUser = req as AuthenticatedRequest;
    expect(RequestWithUser.user).toEqual(mockUser);
  });
});
