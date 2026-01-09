import request from "supertest";

jest.mock("../../src/middleware/authMiddleware", () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: 123, email: "test@test.com" };
    next();
  },
}));

jest.mock("../../src/services/columns.service", () => ({
  createForUser: jest.fn(),
  updateForUser: jest.fn(),
  reorderForUser: jest.fn(),
  deleteForUser: jest.fn(),
}));

import { makeTestApp } from "../helpers/app";
import * as columnsService from "../../src/services/columns.service";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Columns routes", () => {
  const app = makeTestApp();

  describe("POST /boards/:id/columns", () => {
    it("creates a column and returns 201", async () => {
      const newColumn = { id: 10, name: "ToDo", position: 0 };
      (columnsService.createForUser as jest.Mock).mockResolvedValue(newColumn);

      const res = await request(app).post("/boards/1/columns").send({ name: "ToDo" });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ column: newColumn });
      expect(columnsService.createForUser).toHaveBeenCalledWith(123, 1, "ToDo");
    });

    it("returns 400 if name is missing", async () => {
      const res = await request(app).post("/boards/1/columns").send({});

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Column name is required" });
    });

    it("returns 500 if service throws", async () => {
      (columnsService.createForUser as jest.Mock).mockRejectedValue(new Error("DB error"));

      const res = await request(app).post("/boards/1/columns").send({ name: "ToDo" });

      expect(res.status).toBe(500);
    });
  });

  describe("PATCH /columns/:columnId", () => {
    it("updates a column and returns 200", async () => {
      const updated = { id: 10, name: "Doing" };
      (columnsService.updateForUser as jest.Mock).mockResolvedValue(updated);

      const res = await request(app).patch("/columns/10").send({ name: "Doing" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ column: updated });
      expect(columnsService.updateForUser).toHaveBeenCalledWith(123, 10, { name: "Doing" });
    });

    it("returns 400 if name is not a string", async () => {
      const res = await request(app).patch("/columns/10").send({ name: 123 });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Column name must be a string" });
    });

    it("returns 404 if column not found", async () => {
      (columnsService.updateForUser as jest.Mock).mockResolvedValue(null);

      const res = await request(app).patch("/columns/10").send({ name: "X" });

      expect(res.status).toBe(404);
    });

    it("returns 403 if service throws 403", async () => {
      (columnsService.updateForUser as jest.Mock).mockRejectedValue(Object.assign(new Error("Forbidden"), { status: 403 }));

      const res = await request(app).patch("/columns/10").send({ name: "X" });

      expect(res.status).toBe(403);
    });
  });

  describe("PATCH /boards/:id/columns/reorder", () => {
    it("reorders columns and returns 200", async () => {
      (columnsService.reorderForUser as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .patch("/boards/1/columns/reorder")
        .send({ columnIds: [5, 6, 7] });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Reordered" });
      expect(columnsService.reorderForUser).toHaveBeenCalledWith(123, 1, [5, 6, 7]);
    });

    it("returns 400 if columnIds is invalid", async () => {
      const res = await request(app).patch("/boards/1/columns/reorder").send({ columnIds: "nope" });

      expect(res.status).toBe(400);
    });

    it("returns 403 if service throws 403", async () => {
      (columnsService.reorderForUser as jest.Mock).mockRejectedValue(Object.assign(new Error("Forbidden"), { status: 403 }));

      const res = await request(app).patch("/boards/1/columns/reorder").send({ columnIds: [1, 2] });

      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /columns/:columnId", () => {
    it("deletes the column and returns 200", async () => {
      (columnsService.deleteForUser as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app).delete("/columns/10");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Deleted" });
    });

    it("returns 404 if column not found", async () => {
      (columnsService.deleteForUser as jest.Mock).mockResolvedValue(null);

      const res = await request(app).delete("/columns/10");

      expect(res.status).toBe(404);
    });

    it("returns 403 if service throws 403", async () => {
      (columnsService.deleteForUser as jest.Mock).mockRejectedValue(Object.assign(new Error("Forbidden"), { status: 403 }));

      const res = await request(app).delete("/columns/10");

      expect(res.status).toBe(403);
    });
  });
});
