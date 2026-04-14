import { type NextRequest, NextResponse } from "next/server";
import { prisma, ratelimit } from "@/server/db";
import {
  Prisma,
  IssueType,
  type Issue,
  IssueStatus,
  type DefaultUser,
  WorkflowReviewStatus,
  WorkflowType,
} from "@prisma/client";
import { z } from "zod";
import { getAuth } from "@clerk/nextjs/server";
import {
  calculateInsertPosition,
} from "@/utils/helpers";
import { DEMO_ADMIN_ID } from "@/prisma/seed-data";
import { canCreateTest } from "@/utils/workflow";
import {
  ensureAuthenticatedAdminUser,
  getInitialIssuesFromServer,
} from "@/server/functions";

export const dynamic = "force-dynamic";

const postIssuesBodyValidator = z.object({
  name: z.string(),
  type: z.enum(["BUG", "STORY", "TASK", "EPIC", "SUBTASK"]),
  sprintId: z.string().nullable(),
  reporterId: z.string().nullable(),
  assigneeId: z.string().nullable().optional(),
  parentId: z.string().nullable(),
  sprintColor: z.string().nullable().optional(),
  workflowType: z.nativeEnum(WorkflowType).optional(),
  requestedCount: z.number().int().positive().nullable().optional(),
  chainage: z.string().nullable().optional(),
  truckDetails: z.string().nullable().optional(),
  sampleLabel: z.string().nullable().optional(),
  initialWeight: z.number().nullable().optional(),
  finalWeight: z.number().nullable().optional(),
  levelOneStatus: z.nativeEnum(WorkflowReviewStatus).optional(),
  levelOneNote: z.string().nullable().optional(),
  levelTwoStatus: z.nativeEnum(WorkflowReviewStatus).optional(),
  levelTwoNote: z.string().nullable().optional(),
  extraFields: z.record(z.unknown()).nullable().optional(),
});

export type PostIssueBody = z.infer<typeof postIssuesBodyValidator>;

const patchIssuesBodyValidator = z.object({
  ids: z.array(z.string()),
  type: z.nativeEnum(IssueType).optional(),
  status: z.nativeEnum(IssueStatus).optional(),
  assigneeId: z.string().nullable().optional(),
  reporterId: z.string().optional(),
  parentId: z.string().nullable().optional(),
  sprintId: z.string().nullable().optional(),
  isDeleted: z.boolean().optional(),
  levelOneStatus: z.nativeEnum(WorkflowReviewStatus).optional(),
  levelTwoStatus: z.nativeEnum(WorkflowReviewStatus).optional(),
});

export type PatchIssuesBody = z.infer<typeof patchIssuesBodyValidator>;

type IssueT = Issue & {
  children: IssueT[];
  sprintIsActive: boolean;
  parent: Issue & {
    sprintIsActive: boolean;
    children: IssueT[];
    parent: null;
    assignee: DefaultUser | null;
    reporter: DefaultUser | null;
  };
  assignee: DefaultUser | null;
  reporter: DefaultUser | null;
};

export type GetIssuesResponse = {
  issues: IssueT[];
};

function isParentTest(input: {
  type?: IssueType;
  parentId?: string | null;
}) {
  return input.type === "TASK" && !input.parentId;
}

function buildTestInstanceName(parentName: string, instanceNumber: number) {
  return `${parentName} - Test Instance ${instanceNumber}`;
}

function calculateMoisture(
  initialWeight: number | null | undefined,
  finalWeight: number | null | undefined
) {
  if (initialWeight == null || finalWeight == null) {
    return {
      moistureWeight: null,
      moisturePct: null,
    };
  }

  const moistureWeight = Number((initialWeight - finalWeight).toFixed(3));
  const moisturePct =
    initialWeight === 0
      ? null
      : Number(((moistureWeight / initialWeight) * 100).toFixed(3));

  return { moistureWeight, moisturePct };
}

function normalizeExtraFields(
  extraFields: Record<string, unknown> | null | undefined
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (extraFields === undefined) return undefined;
  if (extraFields === null) return Prisma.JsonNull;
  return extraFields as Prisma.InputJsonValue;
}

export async function GET(req: NextRequest) {
  const { userId } = getAuth(req);
  const issues = await getInitialIssuesFromServer(userId);
  return NextResponse.json({ issues });
}

// POST
export async function POST(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) return new Response("Unauthenticated request", { status: 403 });
  const { success } = await ratelimit.limit(userId);
  if (!success) return new Response("Too many requests", { status: 429 });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const body = await req.json();

  const validated = postIssuesBodyValidator.safeParse(body);

  if (!validated.success) {
    const message =
      "Invalid body. " + (validated.error.errors[0]?.message ?? "");
    return new Response(message, { status: 400 });
  }

  const { data: valid } = validated;
  await ensureAuthenticatedAdminUser(userId);
  const actor = await prisma.defaultUser.findUnique({
    where: {
      id: userId,
    },
  });

  if (valid.type === "TASK" && !valid.parentId && !canCreateTest({
    userId,
    role: actor?.role ?? null,
  })) {
    return new Response("Only the RFI creator can create new tests", {
      status: 403,
    });
  }

  const issues = await prisma.issue.findMany({
    where: {
      creatorId: userId,
    },
  });

  const currentSprintIssues = issues.filter(
    (issue) => issue.sprintId === valid.sprintId && issue.isDeleted === false
  );

  const sprint = await prisma.sprint.findUnique({
    where: {
      id: valid.sprintId ?? "",
    },
  });

  let boardPosition = -1;

  if (sprint && sprint.status === "ACTIVE") {
    // If issue is created in active sprint, add it to the bottom of the TODO column in board
    const issuesInColum = currentSprintIssues.filter(
      (issue) => issue.status === "TODO"
    );
    boardPosition = calculateInsertPosition(issuesInColum);
  }

  const k = issues.length + 1;

  const positionToInsert = calculateInsertPosition(currentSprintIssues);
  const parentIssue = valid.parentId
    ? await prisma.issue.findUnique({
        where: {
          id: valid.parentId,
        },
      })
    : null;

  const effectiveSprintId =
    valid.parentId && parentIssue ? parentIssue.sprintId : valid.sprintId;
  const effectiveAssigneeId =
    valid.assigneeId !== undefined
      ? valid.assigneeId
      : parentIssue?.assigneeId ?? null;
  const isTopLevelTest = isParentTest({
    type: valid.type,
    parentId: valid.parentId,
  });
  const isTestInstance = valid.type === "SUBTASK";
  const metrics = calculateMoisture(
    isTestInstance ? valid.initialWeight : null,
    isTestInstance ? valid.finalWeight : null
  );

  const issue = await prisma.$transaction(async (tx) => {
    const createdIssue = await tx.issue.create({
      data: {
        key: `ISSUE-${k}`,
        name: valid.name,
        type: valid.type,
        reporterId: valid.reporterId ?? parentIssue?.reporterId ?? DEMO_ADMIN_ID,
        assigneeId: effectiveAssigneeId,
        sprintId: effectiveSprintId ?? undefined,
        sprintPosition: positionToInsert,
        boardPosition,
        parentId: valid.parentId,
        sprintColor: valid.sprintColor,
        workflowType: valid.workflowType ?? parentIssue?.workflowType,
        requestedCount: isTopLevelTest ? valid.requestedCount ?? 0 : null,
        chainage: isTopLevelTest ? valid.chainage ?? null : null,
        truckDetails: isTopLevelTest ? valid.truckDetails ?? null : null,
        sampleLabel: isTestInstance ? valid.sampleLabel ?? null : null,
        initialWeight: isTestInstance ? valid.initialWeight ?? null : null,
        finalWeight: isTestInstance ? valid.finalWeight ?? null : null,
        moistureWeight: isTestInstance ? metrics.moistureWeight : null,
        moisturePct: isTestInstance ? metrics.moisturePct : null,
        levelOneStatus: isTestInstance
          ? valid.levelOneStatus
          : WorkflowReviewStatus.PENDING,
        levelOneNote: isTestInstance ? valid.levelOneNote ?? null : null,
        levelTwoStatus: isTestInstance
          ? valid.levelTwoStatus
          : WorkflowReviewStatus.PENDING,
        levelTwoNote: isTestInstance ? valid.levelTwoNote ?? null : null,
        extraFields: normalizeExtraFields(valid.extraFields),
        creatorId: userId,
      },
    });

    if (isTopLevelTest && (valid.requestedCount ?? 0) > 0) {
      const childCount = valid.requestedCount ?? 0;
      await Promise.all(
        Array.from({ length: childCount }, (_, index) => {
          const childNumber = index + 1;
          return tx.issue.create({
            data: {
              key: `ISSUE-${k + childNumber}`,
              name: buildTestInstanceName(valid.name, childNumber),
              type: "SUBTASK",
              reporterId:
                valid.reporterId ?? parentIssue?.reporterId ?? DEMO_ADMIN_ID,
              assigneeId: effectiveAssigneeId,
              sprintId: effectiveSprintId ?? undefined,
              sprintPosition: positionToInsert + childNumber / 10,
              boardPosition:
                boardPosition < 0 ? -1 : boardPosition + childNumber / 10,
              parentId: createdIssue.id,
              workflowType:
                valid.workflowType ?? parentIssue?.workflowType ?? undefined,
              requestedCount: null,
              chainage: null,
              truckDetails: null,
              sampleLabel: `Instance ${childNumber}`,
              initialWeight: null,
              finalWeight: null,
              moistureWeight: null,
              moisturePct: null,
              levelOneStatus: WorkflowReviewStatus.PENDING,
              levelOneNote: null,
              levelTwoStatus: WorkflowReviewStatus.PENDING,
              levelTwoNote: null,
              extraFields: Prisma.JsonNull,
              creatorId: userId,
            },
          });
        })
      );
    }

    return createdIssue;
  });
  // return NextResponse.json<PostIssueResponse>({ issue });
  return NextResponse.json({ issue });
}

export async function PATCH(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) return new Response("Unauthenticated request", { status: 403 });
  const { success } = await ratelimit.limit(userId);
  if (!success) return new Response("Too many requests", { status: 429 });
  await ensureAuthenticatedAdminUser(userId);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const body = await req.json();
  const validated = patchIssuesBodyValidator.safeParse(body);

  if (!validated.success) {
    // eslint-disable-next-line
    const message = "Invalid body. " + validated.error.errors[0]?.message ?? "";
    return new Response(message, { status: 400 });
  }

  const { data: valid } = validated;

  const issuesToUpdate = await prisma.issue.findMany({
    where: {
      id: {
        in: valid.ids,
      },
    },
  });

  const updatedIssues = await Promise.all(
    issuesToUpdate.map(async (issue) => {
      return await prisma.issue.update({
        where: {
          id: issue.id,
        },
        data: {
          type: valid.type ?? undefined,
          status: valid.status ?? undefined,
          assigneeId: valid.assigneeId ?? undefined,
          reporterId: valid.reporterId ?? undefined,
          isDeleted: valid.isDeleted ?? undefined,
          sprintId: valid.sprintId === undefined ? undefined : valid.sprintId,
          parentId: valid.parentId ?? undefined,
          levelOneStatus: valid.levelOneStatus,
          levelTwoStatus: valid.levelTwoStatus,
        },
      });
    })
  );

  // return NextResponse.json<PostIssueResponse>({ issue });
  return NextResponse.json({ issues: updatedIssues });
}
