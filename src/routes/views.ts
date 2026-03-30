import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import * as viewsController from "../controllers/views.controller";

const router = Router({ mergeParams: true });

router.get("/", authenticateToken, viewsController.listViews);
router.post("/", authenticateToken, viewsController.createView);
router.get("/:viewId", authenticateToken, viewsController.getView);
router.put("/:viewId", authenticateToken, viewsController.updateView);
router.delete("/:viewId", authenticateToken, viewsController.deleteView);
router.get("/:viewId/tasks", authenticateToken, viewsController.executeView);

export default router;
