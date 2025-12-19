import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import prisma from "../prisma/client";

const router = Router();

router.get("/", authenticateToken, async (req, res) => {
  const userId = (req as any).user?.id;
  const boards = await prisma.board.findMany({
    where: {
      members: {
        some: {
          userId,
        },
      },
    },
  });

  res.json({ boards });
});

router.post("/add", authenticateToken, async (req, res) => {
  const userId = (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!req.body || !req.body.name) {
    return res.status(400).json({ message: "Board name is required" });
  }

  const boardname = req.body.name;

  const board = await prisma.board.create({
    data: {
      name: boardname,
      ownerId: userId,
      members: {
        create: {
          userId,
          role: "OWNER",
        },
      },
    },
  });
  res.json({ board });
});

router.get("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: "Board ID is required" });
  }
  const userId = (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const board = await prisma.board.findFirst({
    where: {
      id: Number(id),
      members: {
        some: {
          userId,
        },
      },
    },
  });
  if (!board) {
    return res.status(404).json({ message: "Board not found" });
  }
  res.json({ board });
});

router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const board = await prisma.board.delete({
    where: { id: Number(id) },
  });
  res.json({ message: `Delete ${id}` });
});

export default router;
