import request from "supertest";

jest.mock("../../src/middleware/authMiddleware", () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: 123, email: "test@test.com" };
    next();
  },
}));

jest.mock("../../src/services/views.service", () => ({
  listViews: jest.fn(),
  createView: jest.fn(),
  getView: jest.fn(),
  updateView: jest.fn(),
  deleteView: jest.fn(),
  executeView: jest.fn(),
}));

import { makeTestApp } from "../helpers/app";
import * as viewsService from "../../src/services/views.service";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Views routes", () => {
  const app = makeTestApp();

  describe("GET /orgs/:id/views", () => {
    it("returns 200 and { views }", async () => {
      const views = [{ id: 1, name: "Standup", orgId: 1 }];
      (viewsService.listViews as jest.Mock).mockResolvedValue(views);

      const res = await request(app).get("/orgs/1/views");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ views });
      expect(viewsService.listViews).toHaveBeenCalledWith(123, 1);
    });

    it("returns 400 if org id is invalid", async () => {
      const res = await request(app).get("/orgs/abc/views");
      expect(res.status).toBe(400);
    });

    it("returns 404 if user is not a member", async () => {
      (viewsService.listViews as jest.Mock).mockRejectedValue(
        Object.assign(new Error("Organization not found"), { status: 404 }),
      );
      const res = await request(app).get("/orgs/1/views");
      expect(res.status).toBe(404);
    });
  });

  describe("POST /orgs/:id/views", () => {
    const config = { boardIds: null, groupBy: "assignee" };

    it("creates a view and returns 201", async () => {
      const view = { id: 1, name: "Standup", orgId: 1, config };
      (viewsService.createView as jest.Mock).mockResolvedValue(view);

      const res = await request(app)
        .post("/orgs/1/views")
        .send({ name: "Standup", config });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ view });
      expect(viewsService.createView).toHaveBeenCalledWith(123, 1, "Standup", config);
    });

    it("returns 400 if name is missing", async () => {
      const res = await request(app).post("/orgs/1/views").send({ config });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "name is required" });
    });

    it("returns 400 if config is missing", async () => {
      const res = await request(app).post("/orgs/1/views").send({ name: "Standup" });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "config is required" });
    });

    it("returns 400 if config is an array", async () => {
      const res = await request(app)
        .post("/orgs/1/views")
        .send({ name: "Standup", config: [] });
      expect(res.status).toBe(400);
    });

    it("returns 403 if user is a MEMBER", async () => {
      (viewsService.createView as jest.Mock).mockRejectedValue(
        Object.assign(new Error("Forbidden"), { status: 403 }),
      );
      const res = await request(app)
        .post("/orgs/1/views")
        .send({ name: "Standup", config });
      expect(res.status).toBe(403);
    });
  });

  describe("GET /orgs/:id/views/:viewId", () => {
    it("returns 200 and the view", async () => {
      const view = { id: 5, name: "Standup", orgId: 1 };
      (viewsService.getView as jest.Mock).mockResolvedValue(view);

      const res = await request(app).get("/orgs/1/views/5");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ view });
      expect(viewsService.getView).toHaveBeenCalledWith(123, 1, 5);
    });

    it("returns 400 if viewId is invalid", async () => {
      const res = await request(app).get("/orgs/1/views/abc");
      expect(res.status).toBe(400);
    });

    it("returns 404 if view not found", async () => {
      (viewsService.getView as jest.Mock).mockRejectedValue(
        Object.assign(new Error("View not found"), { status: 404 }),
      );
      const res = await request(app).get("/orgs/1/views/5");
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /orgs/:id/views/:viewId", () => {
    it("updates a view and returns 200", async () => {
      const view = { id: 5, name: "Updated", orgId: 1 };
      (viewsService.updateView as jest.Mock).mockResolvedValue(view);

      const res = await request(app)
        .put("/orgs/1/views/5")
        .send({ name: "Updated" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ view });
      expect(viewsService.updateView).toHaveBeenCalledWith(123, 1, 5, {
        name: "Updated",
        config: undefined,
      });
    });

    it("returns 400 if name is not a string", async () => {
      const res = await request(app)
        .put("/orgs/1/views/5")
        .send({ name: 42 });
      expect(res.status).toBe(400);
    });

    it("returns 400 if config is an array", async () => {
      const res = await request(app)
        .put("/orgs/1/views/5")
        .send({ config: [] });
      expect(res.status).toBe(400);
    });

    it("returns 403 if user is a MEMBER", async () => {
      (viewsService.updateView as jest.Mock).mockRejectedValue(
        Object.assign(new Error("Forbidden"), { status: 403 }),
      );
      const res = await request(app)
        .put("/orgs/1/views/5")
        .send({ name: "Updated" });
      expect(res.status).toBe(403);
    });

    it("returns 404 if view not found", async () => {
      (viewsService.updateView as jest.Mock).mockRejectedValue(
        Object.assign(new Error("View not found"), { status: 404 }),
      );
      const res = await request(app)
        .put("/orgs/1/views/5")
        .send({ name: "Updated" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /orgs/:id/views/:viewId", () => {
    it("deletes a view and returns 200", async () => {
      (viewsService.deleteView as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app).delete("/orgs/1/views/5");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Deleted" });
      expect(viewsService.deleteView).toHaveBeenCalledWith(123, 1, 5);
    });

    it("returns 403 if user is a MEMBER", async () => {
      (viewsService.deleteView as jest.Mock).mockRejectedValue(
        Object.assign(new Error("Forbidden"), { status: 403 }),
      );
      const res = await request(app).delete("/orgs/1/views/5");
      expect(res.status).toBe(403);
    });

    it("returns 404 if view not found", async () => {
      (viewsService.deleteView as jest.Mock).mockRejectedValue(
        Object.assign(new Error("View not found"), { status: 404 }),
      );
      const res = await request(app).delete("/orgs/1/views/5");
      expect(res.status).toBe(404);
    });
  });

  describe("GET /orgs/:id/views/:viewId/tasks", () => {
    it("returns 200 with ungrouped tasks", async () => {
      const result = { tasks: [{ id: 1, title: "Fix bug" }], groupBy: null };
      (viewsService.executeView as jest.Mock).mockResolvedValue(result);

      const res = await request(app).get("/orgs/1/views/5/tasks");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(result);
      expect(viewsService.executeView).toHaveBeenCalledWith(123, 1, 5);
    });

    it("returns 200 with grouped tasks", async () => {
      const result = {
        groupBy: "assignee",
        groups: [
          { key: "10", label: "Alice", tasks: [{ id: 1, title: "Fix bug" }] },
          { key: "unassigned", label: "Unassigned", tasks: [] },
        ],
      };
      (viewsService.executeView as jest.Mock).mockResolvedValue(result);

      const res = await request(app).get("/orgs/1/views/5/tasks");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(result);
    });

    it("returns 404 if view not found", async () => {
      (viewsService.executeView as jest.Mock).mockRejectedValue(
        Object.assign(new Error("View not found"), { status: 404 }),
      );
      const res = await request(app).get("/orgs/1/views/5/tasks");
      expect(res.status).toBe(404);
    });
  });
});
