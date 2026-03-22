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
}));

afterEach(() => {
  jest.clearAllMocks();
});

describe("org.service", () => {
  describe("create", () => {
    it("creates org with creator as OWNER", async () => {
      const fakeOrg = { id: 1, name: "Acme", ownerId: 10 };
      (prisma.organization.create as jest.Mock).mockResolvedValue(fakeOrg);

      const result = await orgService.create(10, "Acme");

      expect(prisma.organization.create).toHaveBeenCalledWith({
        data: {
          name: "Acme",
          ownerId: 10,
          members: { create: { userId: 10, role: "OWNER" } },
        },
      });
      expect(result).toEqual(fakeOrg);
    });
  });

  describe("listForUser", () => {
    it("returns orgs the user belongs to", async () => {
      const fakeOrgs = [{ id: 1, name: "Acme" }];
      (prisma.organization.findMany as jest.Mock).mockResolvedValue(fakeOrgs);

      const result = await orgService.listForUser(10);

      expect(prisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { members: { some: { userId: 10 } } },
        }),
      );
      expect(result).toEqual(fakeOrgs);
    });
  });

  describe("getForMember", () => {
    it("returns org and role for a member", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue({ role: "ADMIN" });
      const fakeOrg = { id: 1, name: "Acme", members: [], boards: [] };
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(fakeOrg);

      const result = await orgService.getForMember(10, 1);

      expect(result).toEqual({ org: fakeOrg, role: "ADMIN" });
    });

    it("throws 404 if user is not a member", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(orgService.getForMember(10, 1)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe("deleteOrg", () => {
    it("deletes org if requester is owner", async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ ownerId: 10 });
      (prisma.organization.delete as jest.Mock).mockResolvedValue(undefined);

      await orgService.deleteOrg(10, 1);

      expect(prisma.organization.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("throws 403 if requester is not owner", async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ ownerId: 99 });

      await expect(orgService.deleteOrg(10, 1)).rejects.toMatchObject({
        status: 403,
      });
      expect(prisma.organization.delete).not.toHaveBeenCalled();
    });

    it("throws 404 if org not found", async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(orgService.deleteOrg(10, 1)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe("addMember", () => {
    it("adds a member when requester is OWNER", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue({ role: "OWNER" });
      const fakeMember = { orgId: 1, userId: 50, role: "MEMBER" };
      (prisma.orgMember.create as jest.Mock).mockResolvedValue(fakeMember);

      const result = await orgService.addMember(10, 1, 50, "MEMBER");

      expect(prisma.orgMember.create).toHaveBeenCalledWith({
        data: { orgId: 1, userId: 50, role: "MEMBER" },
      });
      expect(result).toEqual(fakeMember);
    });

    it("adds a member when requester is ADMIN", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue({ role: "ADMIN" });
      (prisma.orgMember.create as jest.Mock).mockResolvedValue({});

      await orgService.addMember(10, 1, 50, "MEMBER");

      expect(prisma.orgMember.create).toHaveBeenCalled();
    });

    it("throws 403 when requester is MEMBER", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue({ role: "MEMBER" });

      await expect(orgService.addMember(10, 1, 50)).rejects.toMatchObject({
        status: 403,
      });
      expect(prisma.orgMember.create).not.toHaveBeenCalled();
    });

    it("throws 403 when requester is not in org", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(orgService.addMember(10, 1, 50)).rejects.toMatchObject({
        status: 403,
      });
    });
  });

  describe("removeMember", () => {
    it("allows owner to remove a member", async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ ownerId: 10 });
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue({ role: "OWNER" });
      (prisma.orgMember.delete as jest.Mock).mockResolvedValue(undefined);

      await orgService.removeMember(10, 1, 50);

      expect(prisma.orgMember.delete).toHaveBeenCalledWith({
        where: { orgId_userId: { orgId: 1, userId: 50 } },
      });
    });

    it("allows a member to remove themselves", async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ ownerId: 99 });
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue({ role: "MEMBER" });
      (prisma.orgMember.delete as jest.Mock).mockResolvedValue(undefined);

      await orgService.removeMember(50, 1, 50);

      expect(prisma.orgMember.delete).toHaveBeenCalled();
    });

    it("throws 403 if MEMBER tries to remove someone else", async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ ownerId: 99 });
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue({ role: "MEMBER" });

      await expect(orgService.removeMember(10, 1, 50)).rejects.toMatchObject({
        status: 403,
      });
      expect(prisma.orgMember.delete).not.toHaveBeenCalled();
    });

    it("throws 403 if trying to remove the org owner", async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ ownerId: 10 });
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue({ role: "OWNER" });

      await expect(orgService.removeMember(10, 1, 10)).rejects.toMatchObject({
        status: 403,
      });
    });

    it("throws 404 if org not found", async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(orgService.removeMember(10, 1, 50)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe("updateMemberRole", () => {
    it("updates role when requester is owner", async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ ownerId: 10 });
      const updated = { orgId: 1, userId: 50, role: "ADMIN" };
      (prisma.orgMember.update as jest.Mock).mockResolvedValue(updated);

      const result = await orgService.updateMemberRole(10, 1, 50, "ADMIN");

      expect(prisma.orgMember.update).toHaveBeenCalledWith({
        where: { orgId_userId: { orgId: 1, userId: 50 } },
        data: { role: "ADMIN" },
      });
      expect(result).toEqual(updated);
    });

    it("throws 403 if requester is not owner", async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ ownerId: 99 });

      await expect(
        orgService.updateMemberRole(10, 1, 50, "ADMIN"),
      ).rejects.toMatchObject({ status: 403 });
    });

    it("throws 403 if trying to change owner's own role", async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ ownerId: 10 });

      await expect(
        orgService.updateMemberRole(10, 1, 10, "MEMBER"),
      ).rejects.toMatchObject({ status: 403 });
    });

    it("throws 404 if org not found", async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        orgService.updateMemberRole(10, 1, 50, "ADMIN"),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("createBoard", () => {
    it("creates board for OWNER", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue({ role: "OWNER" });
      const fakeBoard = { id: 5, name: "Sprint 1", orgId: 1 };
      (prisma.board.create as jest.Mock).mockResolvedValue(fakeBoard);

      const result = await orgService.createBoard(10, 1, "Sprint 1");

      expect(prisma.board.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: "Sprint 1", orgId: 1, ownerId: 10 }),
      });
      expect(result).toEqual(fakeBoard);
    });

    it("creates board for ADMIN", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue({ role: "ADMIN" });
      (prisma.board.create as jest.Mock).mockResolvedValue({});

      await orgService.createBoard(10, 1, "Sprint 1");

      expect(prisma.board.create).toHaveBeenCalled();
    });

    it("throws 403 for MEMBER", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue({ role: "MEMBER" });

      await expect(orgService.createBoard(10, 1, "Sprint 1")).rejects.toMatchObject({
        status: 403,
      });
      expect(prisma.board.create).not.toHaveBeenCalled();
    });

    it("throws 403 if not in org", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(orgService.createBoard(10, 1, "Sprint 1")).rejects.toMatchObject({
        status: 403,
      });
    });
  });
});
