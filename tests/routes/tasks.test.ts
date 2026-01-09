import request from "supertest";

jest.mock("../../src/middleware/authMiddleware", () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: 123, email: "test@test.com" };
    next();
  },
}));

jest.mock("../../src/services/tasks.service", () => ({
  createForUser: jest.fn(),
  updateForUser: jest.fn(),
  moveForUser: jest.fn(),
  deleteForUser: jest.fn(),
}));

import { makeTestApp } from "../helpers/app";
import * as tasksService from "../../src/services/tasks.service";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Tasks routes", () => {
  const app = makeTestApp();

  describe("POST /columns/:columnId/tasks", () => {
    it("creates a task and returns 201", async () => {
      const newTask = { id: 20, title: "Fix", position: 0 };
      (tasksService.createForUser as jest.Mock).mockResolvedValue(newTask);

      const res = await request(app)
        .post("/columns/1/tasks")
        .send({ title: "Fix" });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ task: newTask });
      expect(tasksService.createForUser).toHaveBeenCalledWith(
        123,
        1,
        "Fix",
        undefined
      );
    });

    it("returns 400 if title is missing", async () => {
      const res = await request(app).post("/columns/1/tasks").send({});

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Task title is required" });
    });

    it("returns 500 if service throws", async () => {
      (tasksService.createForUser as jest.Mock).mockRejectedValue(
        new Error("DB error")
      );

      const res = await request(app)
        .post("/columns/1/tasks")
        .send({ title: "Fix" });

      expect(res.status).toBe(500);
    });
  });

  describe("PATCH /tasks/:taskId", () => {
    it("updates a task and returns 200", async () => {
      const updated = { id: 20, title: "Updated" };
      (tasksService.updateForUser as jest.Mock).mockResolvedValue(updated);

      const res = await request(app)
        .patch("/tasks/20")
        .send({ title: "Updated" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ task: updated });
      expect(tasksService.updateForUser).toHaveBeenCalledWith(123, 20, {
        title: "Updated",
      });
    });

    it("returns 400 if title is not a string", async () => {
      const res = await request(app).patch("/tasks/20").send({ title: 123 });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Task title must be a string" });
    });

    it("returns 404 if task not found", async () => {
      (tasksService.updateForUser as jest.Mock).mockResolvedValue(null);

      const res = await request(app).patch("/tasks/20").send({ title: "X" });

      expect(res.status).toBe(404);
    });

    it("returns 403 if service throws 403", async () => {
      (tasksService.updateForUser as jest.Mock).mockRejectedValue(
        Object.assign(new Error("Forbidden"), { status: 403 })
      );

      const res = await request(app).patch("/tasks/20").send({ title: "X" });

      expect(res.status).toBe(403);
    });
  });

  describe("PATCH /tasks/:taskId/move", () => {
    it("moves a task and returns 200", async () => {
      const moved = { id: 20, columnId: 2, position: 1 };
      (tasksService.moveForUser as jest.Mock).mockResolvedValue(moved);

      const res = await request(app)
        .patch("/tasks/20/move")
        .send({ columnId: 2, position: 1 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Moved", task: moved });
      expect(tasksService.moveForUser).toHaveBeenCalledWith(123, 20, 2, 1);
    });

    it("returns 400 if payload invalid", async () => {
      const res = await request(app)
        .patch("/tasks/20/move")
        .send({ columnId: "nope" });

      expect(res.status).toBe(400);
    });

    it("returns 404 if task not found", async () => {
      (tasksService.moveForUser as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .patch("/tasks/20/move")
        .send({ columnId: 2, position: 0 });

      expect(res.status).toBe(404);
    });

    it("returns 403 if service throws 403", async () => {
      (tasksService.moveForUser as jest.Mock).mockRejectedValue(
        Object.assign(new Error("Forbidden"), { status: 403 })
      );

      const res = await request(app)
        .patch("/tasks/20/move")
        .send({ columnId: 2, position: 0 });

      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /tasks/:taskId", () => {
    it("deletes the task and returns 200", async () => {
      (tasksService.deleteForUser as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app).delete("/tasks/20");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Deleted" });
    });

    it("returns 404 if task not found", async () => {
      (tasksService.deleteForUser as jest.Mock).mockResolvedValue(null);

      const res = await request(app).delete("/tasks/20");

      expect(res.status).toBe(404);
    });

    it("returns 403 if service throws 403", async () => {
      (tasksService.deleteForUser as jest.Mock).mockRejectedValue(
        Object.assign(new Error("Forbidden"), { status: 403 })
      );

      const res = await request(app).delete("/tasks/20");

      expect(res.status).toBe(403);
    });
  });
});
