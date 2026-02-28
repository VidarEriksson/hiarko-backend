import prisma from "../../src/prisma/client";
import * as activityLog from "../../src/services/activityLog.service";
import * as boardsService from "../../src/services/boards.service";

jest.mock("../../src/prisma/client", () => ({
  board: { findMany: jest.fn(), create: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
  boardMember: { findUnique: jest.fn() },
}));

jest.mock("../../src/services/activityLog.service", () => ({
  create: jest.fn(),
}));

describe("boards.service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createForUser", () => {
    it("creates a board and logs the action", async () => {
      const fakeBoard = { id: 5, name: "Test" };
      (prisma.board.create as jest.Mock).mockResolvedValue(fakeBoard);

      const result = await boardsService.createForUser(2, "Test");

      expect(prisma.board.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: "Test", ownerId: 2 }),
      });
      expect(activityLog.create).toHaveBeenCalledWith({
        userId: 2,
        action: "CREATE_BOARD",
        entity: "Board",
        entityId: fakeBoard.id,
        details: "Test",
      });
      expect(result).toEqual(fakeBoard);
    });
  });

  describe("deleteForUser", () => {
    it("deletes a board and logs the action", async () => {
      (prisma.board.findFirst as jest.Mock).mockResolvedValue({ id: 7 });
      (prisma.board.delete as jest.Mock).mockResolvedValue(undefined);

      await boardsService.deleteForUser(3, 7);

      expect(prisma.board.delete).toHaveBeenCalledWith({ where: { id: 7 } });
      expect(activityLog.create).toHaveBeenCalledWith({
        userId: 3,
        action: "DELETE_BOARD",
        entity: "Board",
        entityId: 7,
      });
    });

    it("throws when board not found", async () => {
      (prisma.board.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(boardsService.deleteForUser(3, 9)).rejects.toMatchObject({ status: 403 });
      expect(activityLog.create).not.toHaveBeenCalled();
    });
  });
});
