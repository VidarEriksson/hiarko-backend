import prisma from "../../src/prisma/client";
import * as viewsService from "../../src/services/views.service";

jest.mock("../../src/prisma/client", () => ({
  orgMember: {
    findUnique: jest.fn(),
  },
  view: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  task: {
    findMany: jest.fn(),
  },
}));

afterEach(() => {
  jest.clearAllMocks();
});

const OWNER_MEMBERSHIP = { role: "OWNER" };
const ADMIN_MEMBERSHIP = { role: "ADMIN" };
const MEMBER_MEMBERSHIP = { role: "MEMBER" };

describe("views.service", () => {
  describe("listViews", () => {
    it("returns views for a member", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(OWNER_MEMBERSHIP);
      const fakeViews = [{ id: 1, name: "Standup" }];
      (prisma.view.findMany as jest.Mock).mockResolvedValue(fakeViews);

      const result = await viewsService.listViews(10, 1);

      expect(prisma.view.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orgId: 1 } }),
      );
      expect(result).toEqual(fakeViews);
    });

    it("throws 404 if user is not a member", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(viewsService.listViews(10, 1)).rejects.toMatchObject({
        status: 404,
      });
      expect(prisma.view.findMany).not.toHaveBeenCalled();
    });
  });

  describe("createView", () => {
    const config = { boardIds: null, groupBy: "assignee" as const };

    it("creates a view for OWNER", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(OWNER_MEMBERSHIP);
      const fakeView = { id: 1, name: "Standup", orgId: 1, config };
      (prisma.view.create as jest.Mock).mockResolvedValue(fakeView);

      const result = await viewsService.createView(10, 1, "Standup", config);

      expect(prisma.view.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: "Standup", orgId: 1, createdById: 10 }),
        }),
      );
      expect(result).toEqual(fakeView);
    });

    it("creates a view for ADMIN", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(ADMIN_MEMBERSHIP);
      (prisma.view.create as jest.Mock).mockResolvedValue({});

      await viewsService.createView(10, 1, "Standup", config);

      expect(prisma.view.create).toHaveBeenCalled();
    });

    it("throws 403 for MEMBER", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(MEMBER_MEMBERSHIP);

      await expect(
        viewsService.createView(10, 1, "Standup", config),
      ).rejects.toMatchObject({ status: 403 });
      expect(prisma.view.create).not.toHaveBeenCalled();
    });

    it("throws 404 if not in org", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        viewsService.createView(10, 1, "Standup", config),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("getView", () => {
    it("returns the view for a member", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(MEMBER_MEMBERSHIP);
      const fakeView = { id: 5, name: "Standup", orgId: 1 };
      (prisma.view.findFirst as jest.Mock).mockResolvedValue(fakeView);

      const result = await viewsService.getView(10, 1, 5);

      expect(prisma.view.findFirst).toHaveBeenCalledWith({
        where: { id: 5, orgId: 1 },
      });
      expect(result).toEqual(fakeView);
    });

    it("throws 404 if view does not exist", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(MEMBER_MEMBERSHIP);
      (prisma.view.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(viewsService.getView(10, 1, 5)).rejects.toMatchObject({
        status: 404,
      });
    });

    it("throws 404 if not a member", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(viewsService.getView(10, 1, 5)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe("updateView", () => {
    it("updates name for OWNER", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(OWNER_MEMBERSHIP);
      const fakeView = { id: 5, name: "Old" };
      (prisma.view.findFirst as jest.Mock).mockResolvedValue(fakeView);
      const updated = { id: 5, name: "New" };
      (prisma.view.update as jest.Mock).mockResolvedValue(updated);

      const result = await viewsService.updateView(10, 1, 5, { name: "New" });

      expect(prisma.view.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 5 } }),
      );
      expect(result).toEqual(updated);
    });

    it("updates config for ADMIN", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(ADMIN_MEMBERSHIP);
      (prisma.view.findFirst as jest.Mock).mockResolvedValue({ id: 5 });
      (prisma.view.update as jest.Mock).mockResolvedValue({});

      await viewsService.updateView(10, 1, 5, {
        config: { groupBy: "board" },
      });

      expect(prisma.view.update).toHaveBeenCalled();
    });

    it("throws 403 for MEMBER", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(MEMBER_MEMBERSHIP);

      await expect(
        viewsService.updateView(10, 1, 5, { name: "New" }),
      ).rejects.toMatchObject({ status: 403 });
      expect(prisma.view.update).not.toHaveBeenCalled();
    });

    it("throws 404 if view not found", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(OWNER_MEMBERSHIP);
      (prisma.view.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        viewsService.updateView(10, 1, 5, { name: "New" }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("deleteView", () => {
    it("deletes the view for OWNER", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(OWNER_MEMBERSHIP);
      (prisma.view.findFirst as jest.Mock).mockResolvedValue({ id: 5 });
      (prisma.view.delete as jest.Mock).mockResolvedValue(undefined);

      await viewsService.deleteView(10, 1, 5);

      expect(prisma.view.delete).toHaveBeenCalledWith({ where: { id: 5 } });
    });

    it("throws 403 for MEMBER", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(MEMBER_MEMBERSHIP);

      await expect(viewsService.deleteView(10, 1, 5)).rejects.toMatchObject({
        status: 403,
      });
      expect(prisma.view.delete).not.toHaveBeenCalled();
    });

    it("throws 404 if view not found", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(OWNER_MEMBERSHIP);
      (prisma.view.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(viewsService.deleteView(10, 1, 5)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe("executeView", () => {
    const baseTask = {
      id: 1,
      title: "Fix bug",
      boardId: 2,
      columnId: 3,
      assigneeId: 10,
      priority: 1,
      position: 0,
      assignee: { id: 10, name: "Alice", email: "alice@example.com" },
      createdBy: { id: 10, name: "Alice", email: "alice@example.com" },
      column: { id: 3, name: "In Progress" },
      board: { id: 2, name: "Sprint 1" },
    };

    it("returns ungrouped tasks when groupBy is null", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(MEMBER_MEMBERSHIP);
      (prisma.view.findFirst as jest.Mock).mockResolvedValue({
        id: 5,
        config: { groupBy: null },
      });
      (prisma.task.findMany as jest.Mock).mockResolvedValue([baseTask]);

      const result = await viewsService.executeView(10, 1, 5);

      expect(result).toEqual({ tasks: [baseTask], groupBy: null });
    });

    it("filters by boardIds when specified", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(MEMBER_MEMBERSHIP);
      (prisma.view.findFirst as jest.Mock).mockResolvedValue({
        id: 5,
        config: { boardIds: [2, 3], groupBy: null },
      });
      (prisma.task.findMany as jest.Mock).mockResolvedValue([]);

      await viewsService.executeView(10, 1, 5);

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ boardId: { in: [2, 3] } }),
        }),
      );
    });

    it("filters by columnNames when specified", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(MEMBER_MEMBERSHIP);
      (prisma.view.findFirst as jest.Mock).mockResolvedValue({
        id: 5,
        config: { columnNames: ["In Progress"], groupBy: null },
      });
      (prisma.task.findMany as jest.Mock).mockResolvedValue([]);

      await viewsService.executeView(10, 1, 5);

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            column: { name: { in: ["In Progress"] } },
          }),
        }),
      );
    });

    it("filters by columnIds when specified", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(MEMBER_MEMBERSHIP);
      (prisma.view.findFirst as jest.Mock).mockResolvedValue({
        id: 5,
        config: { columnIds: [3, 4], groupBy: null },
      });
      (prisma.task.findMany as jest.Mock).mockResolvedValue([]);

      await viewsService.executeView(10, 1, 5);

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ columnId: { in: [3, 4] } }),
        }),
      );
    });

    it("filters by assigneeIds", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(MEMBER_MEMBERSHIP);
      (prisma.view.findFirst as jest.Mock).mockResolvedValue({
        id: 5,
        config: { filters: { assigneeIds: [10] }, groupBy: null },
      });
      (prisma.task.findMany as jest.Mock).mockResolvedValue([]);

      await viewsService.executeView(10, 1, 5);

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ assigneeId: { in: [10] } }),
        }),
      );
    });

    it("groups tasks by assignee", async () => {
      const unassignedTask = { ...baseTask, id: 2, assigneeId: null, assignee: null };
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(MEMBER_MEMBERSHIP);
      (prisma.view.findFirst as jest.Mock).mockResolvedValue({
        id: 5,
        config: { groupBy: "assignee" },
      });
      (prisma.task.findMany as jest.Mock).mockResolvedValue([baseTask, unassignedTask]);

      const result = await viewsService.executeView(10, 1, 5) as any;

      expect(result.groupBy).toBe("assignee");
      expect(result.groups).toHaveLength(2);
      const aliceGroup = result.groups.find((g: any) => g.label === "Alice");
      const unassignedGroup = result.groups.find((g: any) => g.key === "unassigned");
      expect(aliceGroup.tasks).toHaveLength(1);
      expect(unassignedGroup.tasks).toHaveLength(1);
    });

    it("groups tasks by board", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(MEMBER_MEMBERSHIP);
      (prisma.view.findFirst as jest.Mock).mockResolvedValue({
        id: 5,
        config: { groupBy: "board" },
      });
      (prisma.task.findMany as jest.Mock).mockResolvedValue([baseTask]);

      const result = await viewsService.executeView(10, 1, 5) as any;

      expect(result.groupBy).toBe("board");
      expect(result.groups[0].label).toBe("Sprint 1");
      expect(result.groups[0].tasks).toHaveLength(1);
    });

    it("groups tasks by column", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(MEMBER_MEMBERSHIP);
      (prisma.view.findFirst as jest.Mock).mockResolvedValue({
        id: 5,
        config: { groupBy: "column" },
      });
      (prisma.task.findMany as jest.Mock).mockResolvedValue([baseTask]);

      const result = await viewsService.executeView(10, 1, 5) as any;

      expect(result.groupBy).toBe("column");
      expect(result.groups[0].label).toBe("In Progress");
    });

    it("groups tasks by priority", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(MEMBER_MEMBERSHIP);
      (prisma.view.findFirst as jest.Mock).mockResolvedValue({
        id: 5,
        config: { groupBy: "priority" },
      });
      (prisma.task.findMany as jest.Mock).mockResolvedValue([baseTask]);

      const result = await viewsService.executeView(10, 1, 5) as any;

      expect(result.groupBy).toBe("priority");
      expect(result.groups[0].key).toBe("1");
    });

    it("throws 404 if view not found", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(MEMBER_MEMBERSHIP);
      (prisma.view.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(viewsService.executeView(10, 1, 5)).rejects.toMatchObject({
        status: 404,
      });
    });

    it("throws 404 if not a member", async () => {
      (prisma.orgMember.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(viewsService.executeView(10, 1, 5)).rejects.toMatchObject({
        status: 404,
      });
    });
  });
});
