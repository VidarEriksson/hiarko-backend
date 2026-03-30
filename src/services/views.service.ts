import prisma from "../prisma/client";
import { Prisma } from "@prisma/client";

interface ViewFilters {
  assigneeIds?: number[] | null;
  priorities?: number[] | null;
  dueBefore?: string | null;
  dueAfter?: string | null;
}

interface ViewConfig {
  boardIds?: number[] | null;
  columnIds?: number[] | null;
  columnNames?: string[] | null;
  displayType?: "kanban" | "list" | "table";
  filters?: ViewFilters;
  groupBy?: "assignee" | "board" | "priority" | "column" | null;
  sortBy?: {
    field: "dueDate" | "priority" | "createdAt" | "position";
    direction: "asc" | "desc";
  } | null;
}

function notFound() {
  return Object.assign(new Error("View not found"), { status: 404 });
}

function forbidden() {
  return Object.assign(new Error("Forbidden"), { status: 403 });
}

async function requireMembership(userId: number, orgId: number) {
  const membership = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId } },
    select: { role: true },
  });
  if (!membership)
    throw Object.assign(new Error("Organization not found"), { status: 404 });
  return membership;
}

const createdBySelect = {
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

export async function listViews(userId: number, orgId: number) {
  await requireMembership(userId, orgId);
  return prisma.view.findMany({
    where: { orgId },
    include: createdBySelect,
    orderBy: { createdAt: "asc" },
  });
}

export async function createView(
  userId: number,
  orgId: number,
  name: string,
  config: ViewConfig
) {
  const membership = await requireMembership(userId, orgId);
  if (membership.role === "MEMBER") throw forbidden();

  return prisma.view.create({
    data: { name, orgId, createdById: userId, config: config as Prisma.InputJsonValue },
    include: createdBySelect,
  });
}

export async function getView(userId: number, orgId: number, viewId: number) {
  await requireMembership(userId, orgId);
  const view = await prisma.view.findFirst({ where: { id: viewId, orgId } });
  if (!view) throw notFound();
  return view;
}

export async function updateView(
  userId: number,
  orgId: number,
  viewId: number,
  data: { name?: string; config?: ViewConfig }
) {
  const membership = await requireMembership(userId, orgId);
  if (membership.role === "MEMBER") throw forbidden();

  const view = await prisma.view.findFirst({ where: { id: viewId, orgId } });
  if (!view) throw notFound();

  return prisma.view.update({
    where: { id: viewId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.config !== undefined && { config: data.config as Prisma.InputJsonValue }),
    },
    include: createdBySelect,
  });
}

export async function deleteView(
  userId: number,
  orgId: number,
  viewId: number
) {
  const membership = await requireMembership(userId, orgId);
  if (membership.role === "MEMBER") throw forbidden();

  const view = await prisma.view.findFirst({ where: { id: viewId, orgId } });
  if (!view) throw notFound();

  await prisma.view.delete({ where: { id: viewId } });
}

export async function executeView(
  userId: number,
  orgId: number,
  viewId: number
) {
  await requireMembership(userId, orgId);

  const view = await prisma.view.findFirst({ where: { id: viewId, orgId } });
  if (!view) throw notFound();

  const config = view.config as ViewConfig;

  const where: Prisma.TaskWhereInput = {
    board: { orgId },
  };

  if (config.boardIds?.length) {
    where.boardId = { in: config.boardIds };
  }

  if (config.columnIds?.length) {
    where.columnId = { in: config.columnIds };
  } else if (config.columnNames?.length) {
    where.column = { name: { in: config.columnNames } };
  }

  const filters = config.filters;
  if (filters) {
    if (filters.assigneeIds?.length) {
      where.assigneeId = { in: filters.assigneeIds };
    }
    if (filters.priorities?.length) {
      where.priority = { in: filters.priorities };
    }
    if (filters.dueBefore || filters.dueAfter) {
      const dateFilter: Prisma.DateTimeNullableFilter<"Task"> = {};
      if (filters.dueBefore) dateFilter.lt = new Date(filters.dueBefore);
      if (filters.dueAfter) dateFilter.gt = new Date(filters.dueAfter);
      where.dueDate = dateFilter;
    }
  }

  const orderBy: Prisma.TaskOrderByWithRelationInput = config.sortBy
    ? { [config.sortBy.field]: config.sortBy.direction }
    : { position: "asc" };

  const tasks = await prisma.task.findMany({
    where,
    orderBy,
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      column: { select: { id: true, name: true } },
      board: { select: { id: true, name: true } },
    },
  });

  if (!config.groupBy) {
    return { tasks, groupBy: null };
  }

  type TaskWithIncludes = (typeof tasks)[number];
  const groupMap = new Map<
    string,
    { key: string; label: string; tasks: TaskWithIncludes[] }
  >();

  for (const task of tasks) {
    let key: string;
    let label: string;

    switch (config.groupBy) {
      case "assignee":
        key = task.assigneeId?.toString() ?? "unassigned";
        label = task.assignee?.name ?? task.assignee?.email ?? "Unassigned";
        break;
      case "board":
        key = task.boardId.toString();
        label = task.board.name;
        break;
      case "priority":
        key = task.priority.toString();
        label = `Priority ${task.priority}`;
        break;
      case "column":
        key = task.columnId.toString();
        label = task.column.name;
        break;
    }

    if (!groupMap.has(key)) {
      groupMap.set(key, { key, label, tasks: [] });
    }
    groupMap.get(key)!.tasks.push(task);
  }

  return { groups: Array.from(groupMap.values()), groupBy: config.groupBy };
}
