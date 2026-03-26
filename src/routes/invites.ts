import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import * as invitesController from "../controllers/invites.controller";

const router = Router();

router.get("/:token", invitesController.getInvite);
router.post("/:token/accept", authenticateToken, invitesController.acceptInvite);
router.post("/:token/decline", authenticateToken, invitesController.declineInvite);

export default router;
