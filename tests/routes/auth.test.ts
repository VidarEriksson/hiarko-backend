import request from "supertest";

jest.mock("../../src/services/auth.service", () => ({
  login: jest.fn(),
  register: jest.fn(),
  getUserById: jest.fn(),
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
    it("returns 200 and { token } on successful login", async () => {
      (authService.login as jest.Mock).mockResolvedValue("mocked-jwt-token");

      const res = await request(app)
        .post("/auth/login")
        .send({ email: "test@test.com", password: "password123" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ token: "mocked-jwt-token" });
      expect(authService.login).toHaveBeenCalledTimes(1);
    });

    it("returns 401 on invalid credentials", async () => {
      const err: any = new Error("Invalid credentials");
      err.status = 401;
      (authService.login as jest.Mock).mockRejectedValue(err);
      const spy = jest.spyOn(console, "error").mockImplementation(() => {});
      const res = await request(app)
        .post("/auth/login")
        .send({ email: "test@test.com", password: "password123" });
      expect(res.status).toBe(401);
      expect(authService.login).toHaveBeenCalledTimes(1);
    });
    describe("POST /auth/register", () => {
      it("returns 201 and user data on successful registration", async () => {
        const mockUser = {
          id: 1,
          email: "test@test.com",
          name: "Test User",
        };
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
    });
    describe("GET /auth/me", () => {
      it("returns 200 and user data when authenticated", async () => {
        const res = await request(app).get("/auth/me");
        //.set("Authorization", "Bearer mocked-jwt-token");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          user: { id: 123, email: "test@test.com" },
        });
      });
    });
  });
});
