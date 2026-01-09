import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import * as columnsController from "../controllers/columns.controller";

const router = Router();

router.patch("/:columnId", authenticateToken, columnsController.updateColumn);
router.delete("/:columnId", authenticateToken, columnsController.deleteColumn);

export default router;
