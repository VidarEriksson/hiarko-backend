import prisma from "../../src/prisma/client";
import * as activityLog from "../../src/services/activityLog.service";
import * as columnsService from "../../src/services/columns.service";

jest.mock("../../src/prisma/client", () => ({
  board: { findFirst: jest.fn() },
  boardColumn: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
}));

jest.mock("../../src/services/activityLog.service", () => ({
  create: jest.fn(),
}));

describe("columns.service", () => {
  afterEach(() => jest.clearAllMocks());

  describe("createForUser", () => {
    it("creates a column and logs it", async () => {
      (prisma.board.findFirst as jest.Mock).mockResolvedValue({ id: 2 });
      (prisma.boardColumn.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.boardColumn.create as jest.Mock).mockResolvedValue({ id: 10, boardId: 2, name: "Col" });

      const result = await columnsService.createForUser(1, 2, "Col");
      expect(result).toEqual({ id: 10, boardId: 2, name: "Col" });
      expect(activityLog.create).toHaveBeenCalledWith({
        userId: 1,
        action: "CREATE_COLUMN",
        entity: "BoardColumn",
        entityId: 10,
        details: "Col",
      });
    });
  });
});
