import { type NextRequest, NextResponse } from "next/server";
import { prisma, ratelimit } from "@/server/db";
import {
  Prisma,
  IssueStatus,
  type Issue,
  IssueType,
  type DefaultUser,
  WorkflowReviewStatus,
  WorkflowType,
} from "@prisma/client";
import { z } from "zod";
import { type GetIssuesResponse } from "../route";
import { clerkClient } from "@clerk/nextjs";
import { filterUserForClient } from "@/utils/helpers";
import { getAuth } from "@clerk/nextjs/server";
import { ensureAuthenticatedAdminUser } from "@/server/functions";
import {
  canManageAssignee,
  canEditLevelOneFields,
  canEditLevelTwoFields,
  canEditTestConfiguration,
  canEditTesterFields,
  canTransitionStatus,
} from "@/utils/workflow";

export const dynamic = "force-dynamic";

export type GetIssueDetailsResponse = {
  issue: GetIssuesResponse["issues"][number] | null;
};

export type PostIssueResponse = { issue: Issue };

export async function GET(
  req: NextRequest,
  { params }: { params: { issueId: string } }
) {
  const { issueId } = params;
  const issue = await prisma.issue.findUnique({
    where: {
      id: issueId,
    },
  });
  if (!issue?.parentId) {
    return NextResponse.json({ issue: { ...issue, parent: null } });
  }
  const parent = await prisma.issue.findUnique({
    where: {
      id: issue.parentId,
    },
  });
  // return NextResponse.json<GetIssueDetailsResponse>({ issue });
  return NextResponse.json({ issue: { ...issue, parent } });
}

const patchIssueBodyValidator = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  type: z.nativeEnum(IssueType).optional(),
  status: z.nativeEnum(IssueStatus).optional(),
  workflowType: z.nativeEnum(WorkflowType).optional(),
  sprintPosition: z.number().optional(),
  boardPosition: z.number().optional(),
  assigneeId: z.string().nullable().optional(),
  reporterId: z.string().optional(),
  parentId: z.string().nullable().optional(),
  sprintId: z.string().nullable().optional(),
  isDeleted: z.boolean().optional(),
  sprintColor: z.string().optional(),
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

export type PatchIssueBody = z.infer<typeof patchIssueBodyValidator>;
export type PatchIssueResponse = {
  issue: Issue & { assignee: DefaultUser | null };
};

type ParamsType = {
  params: {
    issueId: string;
  };
};

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

function isParentTest(input: {
  type?: IssueType;
  parentId?: string | null;
}) {
  return input.type === "TASK" && !input.parentId;
}

function buildTestInstanceName(parentName: string, instanceNumber: number) {
  return `${parentName} - Test Instance ${instanceNumber}`;
}

export async function PATCH(req: NextRequest, { params }: ParamsType) {
  const { userId } = getAuth(req);
  if (!userId) return new Response("Unauthenticated request", { status: 403 });
  const { success } = await ratelimit.limit(userId);
  if (!success) return new Response("Too many requests", { status: 429 });
  await ensureAuthenticatedAdminUser(userId);
  const { issueId } = params;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const body = await req.json();
  const validated = patchIssueBodyValidator.safeParse(body);

  if (!validated.success) {
    // eslint-disable-next-line
    const message = "Invalid body. " + validated.error.errors[0]?.message ?? "";
    return new Response(message, { status: 400 });
  }
  const { data: valid } = validated;

  const currentIssue = await prisma.issue.findUnique({
    where: {
      id: issueId,
    },
  });

  if (!currentIssue) {
    return new Response("Issue not found", { status: 404 });
  }

  const actor = await prisma.defaultUser.findUnique({
    where: {
      id: userId,
    },
  });

  const currentChildren = await prisma.issue.findMany({
    where: {
      parentId: issueId,
      isDeleted: false,
    },
  });

  const issueForPermissions = {
    ...currentIssue,
    children: currentChildren,
  } as GetIssuesResponse["issues"][number];

  const actorContext = {
    userId,
    role: actor?.role ?? null,
  };

  const touchedTesterFields =
    valid.initialWeight !== undefined ||
    valid.finalWeight !== undefined ||
    valid.sampleLabel !== undefined;
  const touchedLevelOneFields =
    valid.levelOneStatus !== undefined || valid.levelOneNote !== undefined;
  const touchedLevelTwoFields =
    valid.levelTwoStatus !== undefined || valid.levelTwoNote !== undefined;
  const touchedParentConfigFields =
    valid.requestedCount !== undefined ||
    valid.chainage !== undefined ||
    valid.truckDetails !== undefined;
  const touchedAssigneeField = valid.assigneeId !== undefined;

  if (touchedTesterFields && !canEditTesterFields(actorContext, issueForPermissions)) {
    return new Response("Only the assigned tester can edit test slip inputs", {
      status: 403,
    });
  }

  if (touchedLevelOneFields && !canEditLevelOneFields(actorContext, issueForPermissions)) {
    return new Response("Only the L1 inspector can edit L1 approval fields", {
      status: 403,
    });
  }

  if (touchedLevelTwoFields && !canEditLevelTwoFields(actorContext, issueForPermissions)) {
    return new Response("Only the L2 inspector can edit L2 approval fields", {
      status: 403,
    });
  }

  if (touchedParentConfigFields && !canEditTestConfiguration(actorContext, issueForPermissions)) {
    return new Response("Only the RFI creator can edit test configuration", {
      status: 403,
    });
  }

  if (touchedAssigneeField && !canManageAssignee(actorContext, issueForPermissions)) {
    return new Response("Only the RFI creator can manage assignments", {
      status: 403,
    });
  }

  if (
    valid.status !== undefined &&
    !canTransitionStatus(actorContext, issueForPermissions, valid.status)
  ) {
    return new Response("You are not allowed to move this item to that workflow stage", {
      status: 403,
    });
  }

  const initialWeight =
    valid.initialWeight === undefined
      ? currentIssue.initialWeight
      : valid.initialWeight;
  const finalWeight =
    valid.finalWeight === undefined ? currentIssue.finalWeight : valid.finalWeight;
  const nextType = valid.type ?? currentIssue.type;
  const nextParentId =
    valid.parentId === undefined ? currentIssue.parentId : valid.parentId;
  const parentTest = isParentTest({ type: nextType, parentId: nextParentId });
  const testInstance = nextType === "SUBTASK";
  const metrics = calculateMoisture(
    testInstance ? initialWeight : null,
    testInstance ? finalWeight : null
  );

  const issue = await prisma.$transaction(async (tx) => {
    const testerRecordedAt =
      touchedTesterFields &&
      testInstance &&
      initialWeight != null &&
      finalWeight != null
        ? currentIssue.testerRecordedAt ?? new Date()
        : testInstance
          ? currentIssue.testerRecordedAt
          : null;

    const nextLevelOneStatus = valid.levelOneStatus ?? currentIssue.levelOneStatus;
    const nextLevelTwoStatus = valid.levelTwoStatus ?? currentIssue.levelTwoStatus;

    const updatedIssue = await tx.issue.update({
      where: {
        id: issueId,
      },
      data: {
        name: valid.name ?? undefined,
        description: valid.description ?? undefined,
        status: valid.status ?? undefined,
        type: valid.type ?? undefined,
        sprintPosition: valid.sprintPosition ?? undefined,
        assigneeId: valid.assigneeId === undefined ? undefined : valid.assigneeId,
        reporterId: valid.reporterId ?? undefined,
        isDeleted: valid.isDeleted ?? undefined,
        sprintId: valid.sprintId === undefined ? undefined : valid.sprintId,
        parentId: valid.parentId === undefined ? undefined : valid.parentId,
        sprintColor: valid.sprintColor ?? undefined,
        boardPosition: valid.boardPosition ?? undefined,
        workflowType: valid.workflowType,
        requestedCount: parentTest
          ? valid.requestedCount === undefined
            ? undefined
            : valid.requestedCount
          : null,
        chainage: parentTest
          ? valid.chainage === undefined
            ? undefined
            : valid.chainage
          : null,
        truckDetails: parentTest
          ? valid.truckDetails === undefined
            ? undefined
            : valid.truckDetails
          : null,
        sampleLabel: testInstance
          ? valid.sampleLabel === undefined
            ? undefined
            : valid.sampleLabel
          : null,
        initialWeight: testInstance ? initialWeight : null,
        finalWeight: testInstance ? finalWeight : null,
        testerRecordedAt,
        moistureWeight: testInstance ? metrics.moistureWeight : null,
        moisturePct: testInstance ? metrics.moisturePct : null,
        levelOneStatus: testInstance
          ? nextLevelOneStatus
          : valid.levelOneStatus === undefined
            ? undefined
            : WorkflowReviewStatus.PENDING,
        levelOneNote: testInstance
          ? valid.levelOneNote === undefined
            ? undefined
            : valid.levelOneNote
          : null,
        levelOneSignedById:
          testInstance && touchedLevelOneFields && nextLevelOneStatus !== "PENDING"
            ? userId
            : testInstance && touchedLevelOneFields
              ? null
              : undefined,
        levelOneSignedAt:
          testInstance && touchedLevelOneFields && nextLevelOneStatus !== "PENDING"
            ? new Date()
            : testInstance && touchedLevelOneFields
              ? null
              : undefined,
        levelTwoStatus: testInstance
          ? nextLevelTwoStatus
          : valid.levelTwoStatus === undefined
            ? undefined
            : WorkflowReviewStatus.PENDING,
        levelTwoNote: testInstance
          ? valid.levelTwoNote === undefined
            ? undefined
            : valid.levelTwoNote
          : null,
        levelTwoSignedById:
          testInstance && touchedLevelTwoFields && nextLevelTwoStatus !== "PENDING"
            ? userId
            : testInstance && touchedLevelTwoFields
              ? null
              : undefined,
        levelTwoSignedAt:
          testInstance && touchedLevelTwoFields && nextLevelTwoStatus !== "PENDING"
            ? new Date()
            : testInstance && touchedLevelTwoFields
              ? null
              : undefined,
        extraFields: normalizeExtraFields(valid.extraFields),
      },
    });

    if (parentTest && valid.assigneeId !== undefined) {
      await tx.issue.updateMany({
        where: {
          parentId: issueId,
          OR: [
            { assigneeId: currentIssue.assigneeId },
            { assigneeId: null },
          ],
        },
        data: {
          assigneeId: valid.assigneeId,
        },
      });
    }

    if (parentTest && valid.requestedCount !== undefined && valid.requestedCount !== null) {
      const existingChildren = await tx.issue.findMany({
        where: {
          parentId: issueId,
          isDeleted: false,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      if (valid.requestedCount > existingChildren.length) {
        const issues = await tx.issue.findMany({
          where: {
            creatorId: userId,
          },
        });

        await Promise.all(
          Array.from(
            { length: valid.requestedCount - existingChildren.length },
            (_, index) => {
              const childNumber = existingChildren.length + index + 1;
              const issueNumber = issues.length + index + 1;
              return tx.issue.create({
                data: {
                  key: `ISSUE-${issueNumber}`,
                  name: buildTestInstanceName(
                    valid.name ?? currentIssue.name,
                    childNumber
                  ),
                  type: "SUBTASK",
                  status: valid.status ?? currentIssue.status,
                  sprintPosition:
                    (valid.sprintPosition ?? currentIssue.sprintPosition) +
                    childNumber / 10,
                  boardPosition:
                    (valid.boardPosition ?? currentIssue.boardPosition) < 0
                      ? -1
                      : (valid.boardPosition ?? currentIssue.boardPosition) +
                        childNumber / 10,
                  reporterId: valid.reporterId ?? currentIssue.reporterId,
                  assigneeId: valid.assigneeId ?? currentIssue.assigneeId,
                  parentId: issueId,
                  sprintId:
                    valid.sprintId === undefined
                      ? currentIssue.sprintId ?? undefined
                      : valid.sprintId ?? undefined,
                  workflowType:
                    valid.workflowType ?? currentIssue.workflowType ?? undefined,
                  sampleLabel: `Instance ${childNumber}`,
                  levelOneStatus: WorkflowReviewStatus.PENDING,
                  levelTwoStatus: WorkflowReviewStatus.PENDING,
                  extraFields: Prisma.JsonNull,
                  creatorId: userId,
                },
              });
            }
          )
        );
      }
    }

    return updatedIssue;
  });

  if (issue.assigneeId) {
    const dbAssignee = await prisma.defaultUser.findUnique({
      where: {
        id: issue.assigneeId,
      },
    });

    let assigneeForClient = dbAssignee;
    if (!assigneeForClient) {
      try {
        const assignee = await clerkClient.users.getUser(issue.assigneeId);
        assigneeForClient = filterUserForClient(assignee);
      } catch {
        assigneeForClient = null;
      }
    }

    return NextResponse.json({
      issue: { ...issue, assignee: assigneeForClient },
    });
  }

  // return NextResponse.json<PostIssueResponse>({ issue });
  return NextResponse.json({
    issue: { ...issue, assignee: null },
  });
}

export async function DELETE(req: NextRequest, { params }: ParamsType) {
  const { userId } = getAuth(req);
  if (!userId) return new Response("Unauthenticated request", { status: 403 });
  const { success } = await ratelimit.limit(userId);
  if (!success) return new Response("Too many requests", { status: 429 });
  await ensureAuthenticatedAdminUser(userId);

  const { issueId } = params;

  const issue = await prisma.issue.update({
    where: {
      id: issueId,
    },
    data: {
      isDeleted: true,
      boardPosition: -1,
      sprintPosition: -1,
      sprintId: "DELETED-SPRINT-ID",
    },
  });

  // return NextResponse.json<PostIssueResponse>({ issue });
  return NextResponse.json({ issue });
}
