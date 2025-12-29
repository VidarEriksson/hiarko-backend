import { Router } from "express";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { authenticateToken } from "../middleware/authMiddleware";
import bcrypt from "bcrypt";
import prisma from "../prisma/client";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "1h";
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
};


router.post("/login", async (req, res) => {
  if(!req.body|| !req.body.email || !req.body.password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ email, id: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return res.json({ token });

});

router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password required" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
});


router.get("/me", authenticateToken, async(req, res) => {
    return res.json({ user: req.user });
});

export default router;