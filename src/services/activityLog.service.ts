import prisma from "../prisma/client";

export interface ActivityLogCreateParams {
  userId?: number;
  action: string;
  entity?: string;
  entityId?: number;
  details?: string | undefined | null;
}

/**
 * Create a new activity log entry.
 */
export async function create(params: ActivityLogCreateParams) {
  // Prisma's generated create input uses nested objects for relations, so we
  // translate our simple params into the shape Prisma expects.  Using the
  // unchecked type would allow passing `userId` directly, but mapping here keeps
  // the rest of the codebase clean and avoids `any` casts.
  const { userId, action, entity, entityId, details } = params;
  const data: any = { action };
  if (entity !== undefined) data.entity = entity;
  if (entityId !== undefined) data.entityId = entityId;
  if (details !== undefined) data.details = details;
  if (userId !== undefined) {
    data.user = { connect: { id: userId } };
  }

  return prisma.activityLog.create({ data });
}
