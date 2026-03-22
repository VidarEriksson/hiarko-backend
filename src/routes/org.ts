import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import * as orgController from "../controllers/org.controller";

const router = Router();

router.get("/", authenticateToken, orgController.listOrgs);
router.post("/", authenticateToken, orgController.createOrg);
router.get("/:id", authenticateToken, orgController.getOrg);
router.delete("/:id", authenticateToken, orgController.deleteOrg);

router.post("/:id/members", authenticateToken, orgController.addMember);
router.delete("/:id/members/:userId", authenticateToken, orgController.removeMember);
router.patch("/:id/members/:userId", authenticateToken, orgController.updateMemberRole);

router.post("/:id/boards", authenticateToken, orgController.createOrgBoard);

export default router;
