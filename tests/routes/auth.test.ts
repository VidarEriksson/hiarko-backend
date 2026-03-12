import request from "supertest";

jest.mock("../../src/services/auth.service", () => ({
  login: jest.fn(),
  register: jest.fn(),
  getUserById: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
}));

jest.mock("../../src/middleware/authMiddleware", () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: 123, email: "test@test.com" };
    next();
  },
}));

import { makeTestApp } from "../helpers/app";
import * as authService from "../../src/services/auth.service";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Auth routes", () => {
  const app = makeTestApp();

  describe("POST /auth/login", () => {
    it("returns 200 and { accessToken, refreshToken } on successful login", async () => {
      (authService.login as jest.Mock).mockResolvedValue({
        accessToken: "mocked-access-token",
        refreshToken: "mocked-refresh-token",
      });

      const res = await request(app)
        .post("/auth/login")
        .send({ email: "test@test.com", password: "password123" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        accessToken: "mocked-access-token",
        refreshToken: "mocked-refresh-token",
      });
      expect(authService.login).toHaveBeenCalledTimes(1);
    });

    it("returns 401 on invalid credentials", async () => {
      const err: any = new Error("Invalid credentials");
      err.status = 401;
      (authService.login as jest.Mock).mockRejectedValue(err);
      jest.spyOn(console, "error").mockImplementation(() => {});

      const res = await request(app)
        .post("/auth/login")
        .send({ email: "test@test.com", password: "wrong" });

      expect(res.status).toBe(401);
      expect(authService.login).toHaveBeenCalledTimes(1);
    });

    it("returns 400 if email or password is missing", async () => {
      const res = await request(app)
        .post("/auth/login")
        .send({ password: "password123" });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Email and password are required" });
    });
  });

  describe("POST /auth/register", () => {
    it("returns 201 and user data on successful registration", async () => {
      const mockUser = { id: 1, email: "test@test.com", name: "Test User" };
      (authService.register as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app).post("/auth/register").send({
        email: "test@test.com",
        password: "password123",
        name: "Test User",
      });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(mockUser);
      expect(authService.register).toHaveBeenCalledTimes(1);
    });

    it("returns 400 if email or password is missing", async () => {
      const res = await request(app)
        .post("/auth/register")
        .send({ password: "password123", name: "Test User" });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "email and password required" });
    });

    it("returns 500 on service error", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});

      const res = await request(app).post("/auth/register").send();

      expect(res.status).toBe(500);
    });
  });

  describe("GET /auth/me", () => {
    it("returns 200 and user data when authenticated", async () => {
      const res = await request(app).get("/auth/me");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ user: { id: 123, email: "test@test.com" } });
    });
  });

  describe("POST /auth/refresh", () => {
    it("returns 200 and new tokens on valid refresh token", async () => {
      (authService.refresh as jest.Mock).mockResolvedValue({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      });

      const res = await request(app)
        .post("/auth/refresh")
        .send({ refreshToken: "valid-refresh-token" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      });
      expect(authService.refresh).toHaveBeenCalledWith("valid-refresh-token");
    });

    it("returns 400 if refreshToken is missing", async () => {
      const res = await request(app).post("/auth/refresh").send({});

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "refreshToken is required" });
      expect(authService.refresh).not.toHaveBeenCalled();
    });

    it("returns 401 if refresh token is invalid or expired", async () => {
      const err: any = new Error("Invalid or expired refresh token");
      err.status = 401;
      (authService.refresh as jest.Mock).mockRejectedValue(err);
      jest.spyOn(console, "error").mockImplementation(() => {});

      const res = await request(app)
        .post("/auth/refresh")
        .send({ refreshToken: "expired-token" });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "Invalid or expired refresh token" });
    });
  });

  describe("POST /auth/logout", () => {
    it("returns 204 on successful logout", async () => {
      (authService.logout as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .post("/auth/logout")
        .send({ refreshToken: "valid-refresh-token" });

      expect(res.status).toBe(204);
      expect(authService.logout).toHaveBeenCalledWith("valid-refresh-token");
    });

    it("returns 400 if refreshToken is missing", async () => {
      const res = await request(app).post("/auth/logout").send({});

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "refreshToken is required" });
      expect(authService.logout).not.toHaveBeenCalled();
    });

    it("returns 500 on service error", async () => {
      (authService.logout as jest.Mock).mockRejectedValue(new Error("db error"));
      jest.spyOn(console, "error").mockImplementation(() => {});

      const res = await request(app)
        .post("/auth/logout")
        .send({ refreshToken: "some-token" });

      expect(res.status).toBe(500);
    });
  });
});
