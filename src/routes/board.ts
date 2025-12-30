import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import * as boardsController from "../controllers/boards.controller";

const router = Router();

router.get("/", authenticateToken, boardsController.listBoards);
router.post("/", authenticateToken, boardsController.createBoard);
router.get("/:id", authenticateToken, boardsController.getBoard);
router.delete("/:id", authenticateToken, boardsController.deleteBoard);

export default router;
