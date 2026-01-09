import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import * as columnsController from "../controllers/columns.controller";
import * as tasksController from "../controllers/tasks.controller";

const router = Router();

router.patch("/:columnId", authenticateToken, columnsController.updateColumn);
router.delete("/:columnId", authenticateToken, columnsController.deleteColumn);

// tasks under a column
router.post("/:columnId/tasks", authenticateToken, tasksController.createTask);

export default router;
