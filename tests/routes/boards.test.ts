import request from "supertest";

jest.mock("../../src/middleware/authMiddleware", () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: 123, email: "test@test.com" };
    next();
  },
}));

jest.mock("../../src/services/boards.service", () => ({
  listForUser: jest.fn(),
  createForUser: jest.fn(),
  getForUser: jest.fn(),
  deleteForUser: jest.fn(),
}));

import { makeTestApp } from "../helpers/app";
import * as boardsService from "../../src/services/boards.service";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Boards routes", () => {
  const app = makeTestApp();

  describe("GET /boards", () => {
    it("returns 200 and { boards }", async () => {
      (boardsService.listForUser as jest.Mock).mockResolvedValue([
        { id: 1, name: "Board A" },
        { id: 2, name: "Board B" },
      ]);

      const res = await request(app).get("/boards");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        boards: [
          { id: 1, name: "Board A" },
          { id: 2, name: "Board B" },
        ],
      });

      expect(boardsService.listForUser).toHaveBeenCalledTimes(1);
      expect(boardsService.listForUser).toHaveBeenCalledWith(123);
    });

    it("returns 500 if service throws (optional)", async () => {
      (boardsService.listForUser as jest.Mock).mockRejectedValue(
        new Error("DB error")
      );

      const res = await request(app).get("/boards");

      expect(res.status).toBe(500);
    });
  });

  describe("POST /boards", () => {
    it("creates a new board and returns 201 and { board }", async () => {
      const newBoard = { id: 3, name: "New Board" };
      (boardsService.createForUser as jest.Mock).mockResolvedValue(newBoard);

      const res = await request(app)
        .post("/boards")
        .send({ name: "New Board" });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ board: newBoard });

      expect(boardsService.createForUser).toHaveBeenCalledTimes(1);
      expect(boardsService.createForUser).toHaveBeenCalledWith(
        123,
        "New Board"
      );
    });

    it("returns 400 if name is missing", async () => {
      const res = await request(app).post("/boards").send({});

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Board name is required" });
    });

    it("returns 500 if service throws", async () => {
      (boardsService.createForUser as jest.Mock).mockRejectedValue(
        new Error("DB error")
      );

      const res = await request(app)
        .post("/boards")
        .send({ name: "New Board" });

      expect(res.status).toBe(500);
    });
  });
  describe("GET /boards/:id", () => {
    it("returns 200 and { board }", async () => {
      const board = { id: 1, name: "Board A" };
      (boardsService.getForUser as jest.Mock).mockResolvedValue(board);

      const res = await request(app).get("/boards/1");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ board });
    });

    it("returns 404 if board not found", async () => {
      (boardsService.getForUser as jest.Mock).mockResolvedValue(null);

      const res = await request(app).get("/boards/1");

      expect(res.status).toBe(404);
    });
    it("returns 400 if id is invalid", async () => {
      const res = await request(app).get("/boards/abc");

      expect(res.status).toBe(400);
    });
  });
  describe("DELETE /boards/:id", () => {
    it("deletes the board and returns 200", async () => {
      (boardsService.deleteForUser as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app).delete("/boards/1");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Deleted" });
    });
    it("returns 403 if board not found", async () => {
      (boardsService.deleteForUser as jest.Mock).mockRejectedValue(
        Object.assign(new Error("Forbidden"), { status: 403 })
      );
      const res = await request(app).delete("/boards/1");

      expect(res.status).toBe(403);
    });
  });
});
