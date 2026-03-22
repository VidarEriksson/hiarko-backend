import request from "supertest";

jest.mock("../../src/middleware/authMiddleware", () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: 123, email: "test@test.com" };
    next();
  },
}));

jest.mock("../../src/services/org.service", () => ({
  listForUser: jest.fn(),
  create: jest.fn(),
  getForMember: jest.fn(),
  deleteOrg: jest.fn(),
  addMember: jest.fn(),
  removeMember: jest.fn(),
  updateMemberRole: jest.fn(),
  createBoard: jest.fn(),
}));

import { makeTestApp } from "../helpers/app";
import * as orgService from "../../src/services/org.service";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Orgs routes", () => {
  const app = makeTestApp();

  describe("GET /orgs", () => {
    it("returns 200 and { orgs }", async () => {
      (orgService.listForUser as jest.Mock).mockResolvedValue([
        { id: 1, name: "Acme" },
      ]);

      const res = await request(app).get("/orgs");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ orgs: [{ id: 1, name: "Acme" }] });
      expect(orgService.listForUser).toHaveBeenCalledWith(123);
    });

    it("returns 500 if service throws", async () => {
      (orgService.listForUser as jest.Mock).mockRejectedValue(new Error("DB"));
      const res = await request(app).get("/orgs");
      expect(res.status).toBe(500);
    });
  });

  describe("POST /orgs", () => {
    it("creates org and returns 201", async () => {
      const org = { id: 1, name: "Acme" };
      (orgService.create as jest.Mock).mockResolvedValue(org);

      const res = await request(app).post("/orgs").send({ name: "Acme" });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ org });
      expect(orgService.create).toHaveBeenCalledWith(123, "Acme");
    });

    it("returns 400 if name is missing", async () => {
      const res = await request(app).post("/orgs").send({});
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Organization name is required" });
    });

    it("returns 500 if service throws", async () => {
      (orgService.create as jest.Mock).mockRejectedValue(new Error("DB"));
      const res = await request(app).post("/orgs").send({ name: "Acme" });
      expect(res.status).toBe(500);
    });
  });

  describe("GET /orgs/:id", () => {
    it("returns 200 with org and role", async () => {
      const result = { org: { id: 1, name: "Acme" }, role: "OWNER" };
      (orgService.getForMember as jest.Mock).mockResolvedValue(result);

      const res = await request(app).get("/orgs/1");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(result);
    });

    it("returns 404 if not a member", async () => {
      (orgService.getForMember as jest.Mock).mockRejectedValue(
        Object.assign(new Error("Organization not found"), { status: 404 }),
      );

      const res = await request(app).get("/orgs/1");
      expect(res.status).toBe(404);
    });

    it("returns 400 if id is invalid", async () => {
      const res = await request(app).get("/orgs/abc");
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /orgs/:id", () => {
    it("returns 200 on success", async () => {
      (orgService.deleteOrg as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app).delete("/orgs/1");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Deleted" });
      expect(orgService.deleteOrg).toHaveBeenCalledWith(123, 1);
    });

    it("returns 403 if not owner", async () => {
      (orgService.deleteOrg as jest.Mock).mockRejectedValue(
        Object.assign(new Error("Forbidden"), { status: 403 }),
      );

      const res = await request(app).delete("/orgs/1");
      expect(res.status).toBe(403);
    });
  });

  describe("POST /orgs/:id/members", () => {
    it("adds a member and returns 201", async () => {
      const member = { orgId: 1, userId: 99, role: "MEMBER" };
      (orgService.addMember as jest.Mock).mockResolvedValue(member);

      const res = await request(app)
        .post("/orgs/1/members")
        .send({ userId: 99 });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ member });
      expect(orgService.addMember).toHaveBeenCalledWith(123, 1, 99, undefined);
    });

    it("passes role if provided", async () => {
      const member = { orgId: 1, userId: 99, role: "ADMIN" };
      (orgService.addMember as jest.Mock).mockResolvedValue(member);

      const res = await request(app)
        .post("/orgs/1/members")
        .send({ userId: 99, role: "ADMIN" });

      expect(res.status).toBe(201);
      expect(orgService.addMember).toHaveBeenCalledWith(123, 1, 99, "ADMIN");
    });

    it("returns 400 if userId is missing", async () => {
      const res = await request(app).post("/orgs/1/members").send({});
      expect(res.status).toBe(400);
    });

    it("returns 400 if role is invalid", async () => {
      const res = await request(app)
        .post("/orgs/1/members")
        .send({ userId: 99, role: "OWNER" });
      expect(res.status).toBe(400);
    });

    it("returns 403 if requester is MEMBER", async () => {
      (orgService.addMember as jest.Mock).mockRejectedValue(
        Object.assign(new Error("Forbidden"), { status: 403 }),
      );

      const res = await request(app)
        .post("/orgs/1/members")
        .send({ userId: 99 });
      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /orgs/:id/members/:userId", () => {
    it("removes a member and returns 200", async () => {
      (orgService.removeMember as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app).delete("/orgs/1/members/99");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Removed" });
      expect(orgService.removeMember).toHaveBeenCalledWith(123, 1, 99);
    });

    it("returns 403 if forbidden", async () => {
      (orgService.removeMember as jest.Mock).mockRejectedValue(
        Object.assign(new Error("Forbidden"), { status: 403 }),
      );

      const res = await request(app).delete("/orgs/1/members/99");
      expect(res.status).toBe(403);
    });
  });

  describe("PATCH /orgs/:id/members/:userId", () => {
    it("updates role and returns 200", async () => {
      const member = { orgId: 1, userId: 99, role: "ADMIN" };
      (orgService.updateMemberRole as jest.Mock).mockResolvedValue(member);

      const res = await request(app)
        .patch("/orgs/1/members/99")
        .send({ role: "ADMIN" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ member });
      expect(orgService.updateMemberRole).toHaveBeenCalledWith(123, 1, 99, "ADMIN");
    });

    it("returns 400 if role is invalid", async () => {
      const res = await request(app)
        .patch("/orgs/1/members/99")
        .send({ role: "OWNER" });
      expect(res.status).toBe(400);
    });

    it("returns 403 if not owner", async () => {
      (orgService.updateMemberRole as jest.Mock).mockRejectedValue(
        Object.assign(new Error("Forbidden"), { status: 403 }),
      );

      const res = await request(app)
        .patch("/orgs/1/members/99")
        .send({ role: "ADMIN" });
      expect(res.status).toBe(403);
    });
  });

  describe("POST /orgs/:id/boards", () => {
    it("creates a board and returns 201", async () => {
      const board = { id: 5, name: "Sprint 1", orgId: 1 };
      (orgService.createBoard as jest.Mock).mockResolvedValue(board);

      const res = await request(app)
        .post("/orgs/1/boards")
        .send({ name: "Sprint 1" });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ board });
      expect(orgService.createBoard).toHaveBeenCalledWith(123, 1, "Sprint 1");
    });

    it("returns 400 if name is missing", async () => {
      const res = await request(app).post("/orgs/1/boards").send({});
      expect(res.status).toBe(400);
    });

    it("returns 403 if member role is too low", async () => {
      (orgService.createBoard as jest.Mock).mockRejectedValue(
        Object.assign(new Error("Forbidden"), { status: 403 }),
      );

      const res = await request(app)
        .post("/orgs/1/boards")
        .send({ name: "Sprint 1" });
      expect(res.status).toBe(403);
    });
  });
});
