import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import * as authController from "../controllers/auth.controller";

const router = Router();

router.post("/login", authController.login);
router.post("/register", authController.register);
router.get("/me", authenticateToken, authController.me);

export default router;