import prisma from "../../src/prisma/client";
import * as activityLog from "../../src/services/activityLog.service";
import * as tasksService from "../../src/services/tasks.service";

jest.mock("../../src/prisma/client", () => ({
  board: { findFirst: jest.fn() },
  boardColumn: { findUnique: jest.fn() },
  task: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), count: jest.fn(), delete: jest.fn(), updateMany: jest.fn() },
}));

jest.mock("../../src/services/activityLog.service", () => ({
  create: jest.fn(),
}));

describe("tasks.service", () => {
  afterEach(() => jest.clearAllMocks());

  describe("createForUser", () => {
    it("creates a task and logs it", async () => {
      (prisma.boardColumn.findUnique as jest.Mock).mockResolvedValue({ id: 1, boardId: 5 });
      (prisma.board.findFirst as jest.Mock).mockResolvedValue({ id: 5 });
      (prisma.task.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.task.create as jest.Mock).mockResolvedValue({ id: 99, title: "Foo" });

      const result = await tasksService.createForUser(4, 1, "Foo");
      expect(result).toEqual({ id: 99, title: "Foo" });
      expect(activityLog.create).toHaveBeenCalledWith({
        userId: 4,
        action: "CREATE_TASK",
        entity: "Task",
        entityId: 99,
        details: "Foo",
      });
    });
  });
});
