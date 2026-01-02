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

    it("returns 500 if service throws (optional)", async () => {
      (boardsService.createForUser as jest.Mock).mockRejectedValue(
        new Error("DB error")
      );

      const res = await request(app)
        .post("/boards")
        .send({ name: "New Board" });

      expect(res.status).toBe(500);
    });
  });
});
