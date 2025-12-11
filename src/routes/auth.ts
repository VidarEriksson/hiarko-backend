import { Router } from "express";
import jwt from "jsonwebtoken";
import { authenticateToken, AuthenticatedRequest } from "../middleware/authMiddleware";


const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "1h";
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
};

const users = {
    username: "testuser",
    password: "password123",
}

router.post("/login", (req, res) => {
  if(!req.body|| !req.body.username || !req.body.password) {
    return res.status(400).json({ message: "Username and password are required" });
  }
  const { username, password } = req.body;


  if (users.username === username && users.password === password) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.json({ token });
  }

  return res.status(401).json({ message: "Invalid credentials" });
});

router.get("/me", authenticateToken, (req: AuthenticatedRequest, res) => {
    return res.json({ user: req.user });
});

export default router;