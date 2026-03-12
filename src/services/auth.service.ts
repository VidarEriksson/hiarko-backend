import prisma from "../prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = "1h";
const REFRESH_TOKEN_EXPIRES_DAYS = 7;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    const err: any = new Error("Invalid credentials");
    err.status = 401;
    throw err;
  }

  const accessToken = jwt.sign({ email, id: user.id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  const refreshToken = await createRefreshToken(user.id);

  return { accessToken, refreshToken };
}

export async function register({
  email,
  password,
  name,
}: {
  email: string;
  password: string;
  name?: string;
}) {
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, name: name ?? null, passwordHash },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  return user;
}

export async function refresh(token: string) {
  const stored = await prisma.refreshToken.findUnique({ where: { token } });

  if (!stored || stored.expiresAt < new Date()) {
    const err: any = new Error("Invalid or expired refresh token");
    err.status = 401;
    throw err;
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user) {
    const err: any = new Error("User not found");
    err.status = 401;
    throw err;
  }

  // Rotate: delete old, issue new
  await prisma.refreshToken.delete({ where: { token } });
  const newRefreshToken = await createRefreshToken(user.id);

  const accessToken = jwt.sign({ email: user.email, id: user.id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(token: string) {
  await prisma.refreshToken.deleteMany({ where: { token } });
}

async function createRefreshToken(userId: number): Promise<string> {
  const token = crypto.randomBytes(64).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

  await prisma.refreshToken.create({ data: { token, userId, expiresAt } });
  return token;
}
