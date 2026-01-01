import request from "supertest";

jest.mock("../../src/middleware/authMiddleware", () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: 123, email: "test@test.com" };
    next();
  },
}));

jest.mock("../../src/services/boards.service", () => ({
  listForUser: jest.fn(),
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
});
