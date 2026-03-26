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
  createInvite: jest.fn(),
  getInvite: jest.fn(),
  acceptInvite: jest.fn(),
  declineInvite: jest.fn(),
}));

import { makeTestApp } from "../helpers/app";
import * as orgService from "../../src/services/org.service";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Invite routes", () => {
  const app = makeTestApp();

  describe("POST /orgs/:id/invites", () => {
    it("creates invite and returns 201 with link", async () => {
      const fakeInvite = { id: 1, token: "abc-token", email: "user@example.com", orgId: 1 };
      (orgService.createInvite as jest.Mock).mockResolvedValue(fakeInvite);

      const res = await request(app)
        .post("/orgs/1/invites")
        .send({ email: "user@example.com" });

      expect(res.status).toBe(201);
      expect(res.body.invite).toEqual(fakeInvite);
      expect(res.body.link).toContain("abc-token");
      expect(orgService.createInvite).toHaveBeenCalledWith(123, 1, "user@example.com");
    });

    it("returns 400 if email is missing", async () => {
      const res = await request(app).post("/orgs/1/invites").send({});
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "email is required" });
    });

    it("returns 400 if org id is invalid", async () => {
      const res = await request(app)
        .post("/orgs/abc/invites")
        .send({ email: "user@example.com" });
      expect(res.status).toBe(400);
    });

    it("returns 403 if requester is not OWNER or ADMIN", async () => {
      (orgService.createInvite as jest.Mock).mockRejectedValue(
        Object.assign(new Error("Forbidden"), { status: 403 }),
      );

      const res = await request(app)
        .post("/orgs/1/invites")
        .send({ email: "user@example.com" });
      expect(res.status).toBe(403);
    });

    it("returns 500 if service throws", async () => {
      (orgService.createInvite as jest.Mock).mockRejectedValue(new Error("DB"));

      const res = await request(app)
        .post("/orgs/1/invites")
        .send({ email: "user@example.com" });
      expect(res.status).toBe(500);
    });
  });

  describe("GET /invites/:token", () => {
    it("returns 200 with invite details", async () => {
      const fakeInvite = {
        id: 1,
        token: "abc-token",
        email: "user@example.com",
        org: { id: 1, name: "Acme" },
        invitedBy: { name: "Admin", email: "admin@example.com" },
      };
      (orgService.getInvite as jest.Mock).mockResolvedValue(fakeInvite);

      const res = await request(app).get("/invites/abc-token");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ invite: fakeInvite });
      expect(orgService.getInvite).toHaveBeenCalledWith("abc-token");
    });

    it("returns 404 if invite not found", async () => {
      (orgService.getInvite as jest.Mock).mockRejectedValue(
        Object.assign(new Error("Invite not found"), { status: 404 }),
      );

      const res = await request(app).get("/invites/bad-token");
      expect(res.status).toBe(404);
    });

    it("returns 410 if invite is expired or already used", async () => {
      (orgService.getInvite as jest.Mock).mockRejectedValue(
        Object.assign(new Error("Invite expired"), { status: 410 }),
      );

      const res = await request(app).get("/invites/old-token");
      expect(res.status).toBe(410);
    });
  });

  describe("POST /invites/:token/accept", () => {
    it("accepts invite and returns org", async () => {
      const fakeOrg = { id: 1, name: "Acme" };
      (orgService.acceptInvite as jest.Mock).mockResolvedValue(fakeOrg);

      const res = await request(app).post("/invites/abc-token/accept");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ org: fakeOrg });
      expect(orgService.acceptInvite).toHaveBeenCalledWith(123, "abc-token");
    });

    it("returns 403 if email does not match", async () => {
      (orgService.acceptInvite as jest.Mock).mockRejectedValue(
        Object.assign(new Error("This invite was sent to a different email address"), { status: 403 }),
      );

      const res = await request(app).post("/invites/abc-token/accept");
      expect(res.status).toBe(403);
    });

    it("returns 410 if invite is expired or already used", async () => {
      (orgService.acceptInvite as jest.Mock).mockRejectedValue(
        Object.assign(new Error("Invite already used"), { status: 410 }),
      );

      const res = await request(app).post("/invites/abc-token/accept");
      expect(res.status).toBe(410);
    });
  });

  describe("POST /invites/:token/decline", () => {
    it("declines invite and returns 200", async () => {
      (orgService.declineInvite as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app).post("/invites/abc-token/decline");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Declined" });
      expect(orgService.declineInvite).toHaveBeenCalledWith(123, "abc-token");
    });

    it("returns 403 if email does not match", async () => {
      (orgService.declineInvite as jest.Mock).mockRejectedValue(
        Object.assign(new Error("This invite was sent to a different email address"), { status: 403 }),
      );

      const res = await request(app).post("/invites/abc-token/decline");
      expect(res.status).toBe(403);
    });
  });
});
