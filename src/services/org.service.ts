import prisma from "../prisma/client";
import crypto from "crypto";

function notFound() {
  return Object.assign(new Error("Organization not found"), { status: 404 });
}

function forbidden() {
  return Object.assign(new Error("Forbidden"), { status: 403 });
}

export async function create(userId: number, name: string) {
  return prisma.organization.create({
    data: {
      name,
      ownerId: userId,
      members: { create: { userId, role: "OWNER" } },
    },
  });
}

export async function listForUser(userId: number) {
  return prisma.organization.findMany({
    where: { members: { some: { userId } } },
    include: { _count: { select: { members: true, boards: true } } },
  });
}

export async function getForMember(userId: number, orgId: number) {
  const membership = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId } },
    select: { role: true },
  });

  if (!membership) throw notFound();

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      boards: true,
    },
  });

  return { org: org!, role: membership.role };
}

export async function deleteOrg(userId: number, orgId: number) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { ownerId: true },
  });

  if (!org) throw notFound();
  if (org.ownerId !== userId) throw forbidden();

  await prisma.organization.delete({ where: { id: orgId } });
}

export async function addMember(
  requesterId: number,
  orgId: number,
  targetUserId: number,
  role: "ADMIN" | "MEMBER" = "MEMBER"
) {
  const requester = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId: requesterId } },
    select: { role: true },
  });

  if (!requester || requester.role === "MEMBER") throw forbidden();

  return prisma.orgMember.create({
    data: { orgId, userId: targetUserId, role },
  });
}

export async function removeMember(
  requesterId: number,
  orgId: number,
  targetUserId: number
) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { ownerId: true },
  });

  if (!org) throw notFound();

  const requester = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId: requesterId } },
    select: { role: true },
  });

  // Can't remove the org owner
  if (targetUserId === org.ownerId) throw forbidden();
  // Must be OWNER or ADMIN to remove others, but anyone can remove themselves
  if (requesterId !== targetUserId && requester?.role === "MEMBER")
    throw forbidden();

  await prisma.orgMember.delete({
    where: { orgId_userId: { orgId, userId: targetUserId } },
  });
}

export async function updateMemberRole(
  requesterId: number,
  orgId: number,
  targetUserId: number,
  role: "ADMIN" | "MEMBER"
) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { ownerId: true },
  });

  if (!org) throw notFound();
  if (org.ownerId !== requesterId) throw forbidden();
  if (targetUserId === org.ownerId) throw forbidden();

  return prisma.orgMember.update({
    where: { orgId_userId: { orgId, userId: targetUserId } },
    data: { role },
  });
}

export async function createInvite(
  requesterId: number,
  orgId: number,
  email: string
) {
  const requester = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId: requesterId } },
    select: { role: true },
  });

  if (!requester || requester.role === "MEMBER") throw forbidden();

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });

  if (!org) throw notFound();

  // Reuse existing pending invite for same email+org if not expired
  const existing = await prisma.orgInvite.findFirst({
    where: { orgId, email, status: "PENDING", expiresAt: { gt: new Date() } },
  });
  if (existing) return existing;

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  return prisma.orgInvite.create({
    data: { token, email, orgId, invitedById: requesterId, expiresAt },
  });
}

export async function getInvite(token: string) {
  const invite = await prisma.orgInvite.findUnique({
    where: { token },
    include: {
      org: { select: { id: true, name: true } },
      invitedBy: { select: { name: true, email: true } },
    },
  });

  if (!invite) throw Object.assign(new Error("Invite not found"), { status: 404 });
  if (invite.status !== "PENDING") throw Object.assign(new Error("Invite already used"), { status: 410 });
  if (invite.expiresAt < new Date()) throw Object.assign(new Error("Invite expired"), { status: 410 });

  return invite;
}

export async function acceptInvite(userId: number, token: string) {
  const invite = await getInvite(token);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
  if (user.email !== invite.email) throw Object.assign(new Error("This invite was sent to a different email address"), { status: 403 });

  // Already a member — just mark accepted
  const existing = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId: invite.orgId, userId } },
  });

  if (!existing) {
    await prisma.orgMember.create({
      data: { orgId: invite.orgId, userId, role: "MEMBER" },
    });
  }

  await prisma.orgInvite.update({
    where: { token },
    data: { status: "ACCEPTED" },
  });

  return invite.org;
}

export async function declineInvite(userId: number, token: string) {
  const invite = await getInvite(token);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
  if (user.email !== invite.email) throw Object.assign(new Error("This invite was sent to a different email address"), { status: 403 });

  await prisma.orgInvite.update({
    where: { token },
    data: { status: "DECLINED" },
  });
}

export async function createBoard(
  userId: number,
  orgId: number,
  name: string
) {
  const membership = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId } },
    select: { role: true },
  });

  if (!membership) throw forbidden();
  if (membership.role === "MEMBER") throw forbidden();

  return prisma.board.create({
    data: {
      name,
      ownerId: userId,
      orgId,
      members: { create: { userId, role: "OWNER" } },
    },
  });
}
