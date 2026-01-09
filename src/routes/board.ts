import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import * as boardsController from "../controllers/boards.controller";
import * as columnsController from "../controllers/columns.controller";

const router = Router();

router.get("/", authenticateToken, boardsController.listBoards);
router.post("/", authenticateToken, boardsController.createBoard);
router.get("/:id", authenticateToken, boardsController.getBoard);
router.delete("/:id", authenticateToken, boardsController.deleteBoard);

router.post("/:id/columns", authenticateToken, columnsController.createColumn);
router.patch(
  "/:id/columns/reorder",
  authenticateToken,
  columnsController.reorderColumns
);

export default router;
