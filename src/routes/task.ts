import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import * as tasksController from "../controllers/tasks.controller";

const router = Router();

router.patch("/:taskId", authenticateToken, tasksController.updateTask);
router.patch("/:taskId/move", authenticateToken, tasksController.moveTask);
router.delete("/:taskId", authenticateToken, tasksController.deleteTask);

export default router;
