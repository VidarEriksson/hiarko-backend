import prisma from "../prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = "1h";
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

  const token = jwt.sign({ email, id: user.id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
  return token;
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
