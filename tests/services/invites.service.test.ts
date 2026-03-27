import prisma from "../../src/prisma/client";
import * as orgService from "../../src/services/org.service";

jest.mock("../../src/prisma/client", () => ({
  organization: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  orgMember: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  board: {
    create: jest.fn(),
  },
  orgInvite: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  board: {
    findMany: jest.fn(),
  },
  boardMember: {
    createMany: jest.fn(),
  },
}));

jest.mock("crypto", () => ({
  randomUUID: jest.fn(() => "mocked-uuid"),
}));

afterEach(() => {
  jest.clearAllMocks();
});

const FUTURE = new Date(Date.now() + 86400_000);
const PAST = new Date(Date.now() - 86400_000);

describe("org.service — invites", () => {
  describe("createInvite", () => {
    it("creates a new invite for an ADMIN requester", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue({ role: "ADMIN" });
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ name: "Acme" });
      (prisma.orgInvite.findFirst as jest.Mock).mockResolvedValue(null);
      const fakeInvite = { id: 1, token: "mocked-uuid", email: "user@example.com" };
      (prisma.orgInvite.create as jest.Mock).mockResolvedValue(fakeInvite);

      const result = await orgService.createInvite(10, 1, "user@example.com");

      expect(prisma.orgInvite.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            token: "mocked-uuid",
            email: "user@example.com",
            orgId: 1,
            invitedById: 10,
          }),
        }),
      );
      expect(result).toEqual(fakeInvite);
    });

    it("creates a new invite for an OWNER requester", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue({ role: "OWNER" });
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ name: "Acme" });
      (prisma.orgInvite.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.orgInvite.create as jest.Mock).mockResolvedValue({});

      await orgService.createInvite(10, 1, "user@example.com");

      expect(prisma.orgInvite.create).toHaveBeenCalled();
    });

    it("reuses existing pending non-expired invite", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue({ role: "ADMIN" });
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ name: "Acme" });
      const existingInvite = { id: 5, token: "existing-token", email: "user@example.com" };
      (prisma.orgInvite.findFirst as jest.Mock).mockResolvedValue(existingInvite);

      const result = await orgService.createInvite(10, 1, "user@example.com");

      expect(prisma.orgInvite.create).not.toHaveBeenCalled();
      expect(result).toEqual(existingInvite);
    });

    it("throws 403 if requester is MEMBER", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue({ role: "MEMBER" });

      await expect(orgService.createInvite(10, 1, "user@example.com")).rejects.toMatchObject({
        status: 403,
      });
      expect(prisma.orgInvite.create).not.toHaveBeenCalled();
    });

    it("throws 403 if requester is not in org", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(orgService.createInvite(10, 1, "user@example.com")).rejects.toMatchObject({
        status: 403,
      });
    });

    it("throws 404 if org not found", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue({ role: "ADMIN" });
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.orgInvite.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(orgService.createInvite(10, 1, "user@example.com")).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe("getInvite", () => {
    it("returns invite with org and invitedBy", async () => {
      const fakeInvite = {
        token: "abc",
        status: "PENDING",
        expiresAt: FUTURE,
        org: { id: 1, name: "Acme" },
        invitedBy: { name: "Admin", email: "admin@example.com" },
      };
      (prisma.orgInvite.findUnique as jest.Mock).mockResolvedValue(fakeInvite);

      const result = await orgService.getInvite("abc");

      expect(result).toEqual(fakeInvite);
    });

    it("throws 404 if token not found", async () => {
      (prisma.orgInvite.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(orgService.getInvite("bad-token")).rejects.toMatchObject({ status: 404 });
    });

    it("throws 410 if invite is already accepted", async () => {
      (prisma.orgInvite.findUnique as jest.Mock).mockResolvedValue({
        token: "abc",
        status: "ACCEPTED",
        expiresAt: FUTURE,
      });

      await expect(orgService.getInvite("abc")).rejects.toMatchObject({ status: 410 });
    });

    it("throws 410 if invite is expired", async () => {
      (prisma.orgInvite.findUnique as jest.Mock).mockResolvedValue({
        token: "abc",
        status: "PENDING",
        expiresAt: PAST,
      });

      await expect(orgService.getInvite("abc")).rejects.toMatchObject({ status: 410 });
    });
  });

  describe("acceptInvite", () => {
    const pendingInvite = {
      token: "abc",
      status: "PENDING",
      expiresAt: FUTURE,
      email: "user@example.com",
      orgId: 1,
      org: { id: 1, name: "Acme" },
      invitedBy: { name: "Admin", email: "admin@example.com" },
    };

    it("adds user to org, adds them to all org boards, and marks invite accepted", async () => {
      (prisma.orgInvite.findUnique as jest.Mock).mockResolvedValue(pendingInvite);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ email: "user@example.com" });
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.orgMember.create as jest.Mock).mockResolvedValue({});
      (prisma.board.findMany as jest.Mock).mockResolvedValue([{ id: 10 }, { id: 11 }]);
      (prisma.boardMember.createMany as jest.Mock).mockResolvedValue({ count: 2 });
      (prisma.orgInvite.update as jest.Mock).mockResolvedValue({});

      const result = await orgService.acceptInvite(10, "abc");

      expect(prisma.orgMember.create).toHaveBeenCalledWith({
        data: { orgId: 1, userId: 10, role: "MEMBER" },
      });
      expect(prisma.board.findMany).toHaveBeenCalledWith({
        where: { orgId: 1 },
        select: { id: true },
      });
      expect(prisma.boardMember.createMany).toHaveBeenCalledWith({
        data: [
          { boardId: 10, userId: 10, role: "MEMBER" },
          { boardId: 11, userId: 10, role: "MEMBER" },
        ],
        skipDuplicates: true,
      });
      expect(prisma.orgInvite.update).toHaveBeenCalledWith({
        where: { token: "abc" },
        data: { status: "ACCEPTED" },
      });
      expect(result).toEqual(pendingInvite.org);
    });

    it("does not add duplicate membership if already a member", async () => {
      (prisma.orgInvite.findUnique as jest.Mock).mockResolvedValue(pendingInvite);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ email: "user@example.com" });
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue({ role: "MEMBER" });
      (prisma.orgInvite.update as jest.Mock).mockResolvedValue({});

      await orgService.acceptInvite(10, "abc");

      expect(prisma.orgMember.create).not.toHaveBeenCalled();
      expect(prisma.board.findMany).not.toHaveBeenCalled();
      expect(prisma.orgInvite.update).toHaveBeenCalled();
    });

    it("throws 403 if user email does not match invite email", async () => {
      (prisma.orgInvite.findUnique as jest.Mock).mockResolvedValue(pendingInvite);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ email: "other@example.com" });

      await expect(orgService.acceptInvite(10, "abc")).rejects.toMatchObject({ status: 403 });
      expect(prisma.orgMember.create).not.toHaveBeenCalled();
    });

    it("throws 410 if invite is expired", async () => {
      (prisma.orgInvite.findUnique as jest.Mock).mockResolvedValue({
        ...pendingInvite,
        expiresAt: PAST,
      });

      await expect(orgService.acceptInvite(10, "abc")).rejects.toMatchObject({ status: 410 });
    });
  });

  describe("declineInvite", () => {
    const pendingInvite = {
      token: "abc",
      status: "PENDING",
      expiresAt: FUTURE,
      email: "user@example.com",
      orgId: 1,
      org: { id: 1, name: "Acme" },
      invitedBy: { name: "Admin", email: "admin@example.com" },
    };

    it("marks invite as declined", async () => {
      (prisma.orgInvite.findUnique as jest.Mock).mockResolvedValue(pendingInvite);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ email: "user@example.com" });
      (prisma.orgInvite.update as jest.Mock).mockResolvedValue({});

      await orgService.declineInvite(10, "abc");

      expect(prisma.orgInvite.update).toHaveBeenCalledWith({
        where: { token: "abc" },
        data: { status: "DECLINED" },
      });
    });

    it("throws 403 if user email does not match invite email", async () => {
      (prisma.orgInvite.findUnique as jest.Mock).mockResolvedValue(pendingInvite);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ email: "other@example.com" });

      await expect(orgService.declineInvite(10, "abc")).rejects.toMatchObject({ status: 403 });
      expect(prisma.orgInvite.update).not.toHaveBeenCalled();
    });

    it("throws 410 if invite already used", async () => {
      (prisma.orgInvite.findUnique as jest.Mock).mockResolvedValue({
        ...pendingInvite,
        status: "ACCEPTED",
      });

      await expect(orgService.declineInvite(10, "abc")).rejects.toMatchObject({ status: 410 });
    });
  });
});
