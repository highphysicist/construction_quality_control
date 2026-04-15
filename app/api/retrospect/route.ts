import { type NextRequest, NextResponse } from "next/server";
import { IssueStatus, IssueType, type DefaultUser, type Project } from "@prisma/client";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/server/db";
import {
  ensureAuthenticatedAdminUser,
  getInitialProjectFromServer,
} from "@/server/functions";

export const dynamic = "force-dynamic";

export type RetrospectRecord = {
  id: string;
  key: string;
  type: IssueType;
  name: string;
  status: IssueStatus;
  project: Pick<Project, "id" | "key" | "name">;
  epic: { id: string; key: string; name: string } | null;
  test: { id: string; key: string; name: string } | null;
  testInstance: { id: string; key: string; name: string } | null;
  assignee: Pick<DefaultUser, "id" | "name" | "email"> | null;
  reporter: Pick<DefaultUser, "id" | "name" | "email"> | null;
  chainage: string | null;
  truckDetails: string | null;
  sampleLabel: string | null;
  timestamp: string;
};

export type GetRetrospectResponse = {
  items: RetrospectRecord[];
  total: number;
};

function toBoolean(value: string | null) {
  return value === "1" || value?.toLowerCase() === "true";
}

function buildSearchableText(item: RetrospectRecord) {
  return [
    item.project.name,
    item.project.key,
    item.key,
    item.type,
    item.name,
    item.status,
    item.epic?.key ?? "",
    item.epic?.name ?? "",
    item.test?.key ?? "",
    item.test?.name ?? "",
    item.testInstance?.key ?? "",
    item.testInstance?.name ?? "",
    item.assignee?.name ?? "",
    item.assignee?.email ?? "",
    item.reporter?.name ?? "",
    item.reporter?.email ?? "",
    item.sampleLabel ?? "",
    item.chainage ?? "",
    item.truckDetails ?? "",
    item.timestamp,
  ]
    .join(" ")
    .toLowerCase();
}

function matchWithTokens(searchableText: string, q: string) {
  const tokens = q
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (!tokens.length) return true;

  return tokens.every((token) => searchableText.includes(token));
}

export async function GET(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) {
    return new Response("Unauthenticated request", { status: 403 });
  }

  await ensureAuthenticatedAdminUser(userId);

  const params = req.nextUrl.searchParams;
  const q = params.get("q")?.trim() ?? "";
  const useRegex = toBoolean(params.get("regex"));
  const assigneeId = params.get("assigneeId")?.trim() || null;
  const reporterId = params.get("reporterId")?.trim() || null;
  const typeFilter = params.get("type")?.trim() as IssueType | "ALL" | null;
  const from = params.get("from") ? new Date(params.get("from") as string) : null;
  const to = params.get("to") ? new Date(params.get("to") as string) : null;
  const limit = Math.min(Math.max(Number(params.get("limit") ?? "150"), 1), 500);

  const project = await getInitialProjectFromServer();
  if (!project) {
    return NextResponse.json<GetRetrospectResponse>({ items: [], total: 0 });
  }

  let regex: RegExp | null = null;
  if (q.length > 0 && useRegex) {
    try {
      regex = new RegExp(q, "i");
    } catch {
      return new Response("Invalid regex pattern", { status: 400 });
    }
  }

  const issues = await prisma.issue.findMany({
    where: {
      status: IssueStatus.DONE,
      isDeleted: false,
      type: {
        in: [IssueType.TASK, IssueType.SUBTASK],
      },
    },
    include: {
      parent: {
        include: {
          parent: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 1000,
  });

  const userIds = Array.from(
    new Set(
      issues
        .flatMap((issue) => [issue.assigneeId, issue.reporterId])
        .filter((value): value is string => !!value)
    )
  );

  const users = userIds.length
    ? await prisma.defaultUser.findMany({
        where: {
          id: {
            in: userIds,
          },
        },
      })
    : [];

  const userMap = new Map(users.map((user) => [user.id, user]));

  const records = issues.map<RetrospectRecord>((issue) => {
    const parent = issue.parent;
    const grandParent = issue.parent?.parent;

    const test =
      issue.type === IssueType.TASK
        ? issue
        : parent?.type === IssueType.TASK
          ? parent
          : null;

    const epic =
      parent?.type === IssueType.EPIC
        ? parent
        : grandParent?.type === IssueType.EPIC
          ? grandParent
          : null;

    const recordTimestamp =
      issue.levelTwoSignedAt ??
      issue.levelOneSignedAt ??
      issue.testerRecordedAt ??
      issue.updatedAt ??
      issue.createdAt;

    const assignee = issue.assigneeId ? userMap.get(issue.assigneeId) ?? null : null;
    const reporter = userMap.get(issue.reporterId) ?? null;

    return {
      id: issue.id,
      key: issue.key,
      type: issue.type,
      name: issue.name,
      status: issue.status,
      project: {
        id: project.id,
        key: project.key,
        name: project.name,
      },
      epic: epic
        ? {
            id: epic.id,
            key: epic.key,
            name: epic.name,
          }
        : null,
      test: test
        ? {
            id: test.id,
            key: test.key,
            name: test.name,
          }
        : null,
      testInstance:
        issue.type === IssueType.SUBTASK
          ? {
              id: issue.id,
              key: issue.key,
              name: issue.name,
            }
          : null,
      assignee: assignee
        ? {
            id: assignee.id,
            name: assignee.name,
            email: assignee.email,
          }
        : null,
      reporter: reporter
        ? {
            id: reporter.id,
            name: reporter.name,
            email: reporter.email,
          }
        : null,
      chainage: issue.chainage,
      truckDetails: issue.truckDetails,
      sampleLabel: issue.sampleLabel,
      timestamp: recordTimestamp.toISOString(),
    };
  });

  const filtered = records.filter((item) => {
    if (typeFilter && typeFilter !== "ALL" && item.type !== typeFilter) {
      return false;
    }

    if (assigneeId && item.assignee?.id !== assigneeId) {
      return false;
    }

    if (reporterId && item.reporter?.id !== reporterId) {
      return false;
    }

    const itemDate = new Date(item.timestamp);
    if (from && !Number.isNaN(from.getTime()) && itemDate < from) {
      return false;
    }

    if (to && !Number.isNaN(to.getTime()) && itemDate > to) {
      return false;
    }

    if (!q.length) return true;

    const searchableText = buildSearchableText(item);

    if (regex) {
      return regex.test(searchableText);
    }

    return matchWithTokens(searchableText, q);
  });

  return NextResponse.json<GetRetrospectResponse>({
    items: filtered.slice(0, limit),
    total: filtered.length,
  });
}
