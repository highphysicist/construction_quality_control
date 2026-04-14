import { type IssueStatus, type UserRole } from "@prisma/client";
import { type IssueType } from "./types";
import { isParentTest, isSubtask } from "./helpers";

export type WorkflowActor = {
  userId?: string | null;
  role?: UserRole | null;
};

export const BOARD_STATUSES: IssueStatus[] = [
  "TODO",
  "IN_PROGRESS",
  "INSPECTION",
  "INSPECTION_L2",
  "DONE",
];

export function isWorkflowManager(actor: WorkflowActor, issue?: IssueType | null) {
  return (
    actor.role === "ADMIN" ||
    actor.role === "QUALITY_MANAGER" ||
    (!!issue && !!actor.userId && issue.reporterId === actor.userId)
  );
}

export function canCreateTest(actor: WorkflowActor) {
  return actor.role === "ADMIN" || actor.role === "QUALITY_MANAGER";
}

export function canEditTestConfiguration(
  actor: WorkflowActor,
  issue: IssueType
) {
  return isParentTest(issue) && isWorkflowManager(actor, issue);
}

export function canManageAssignee(actor: WorkflowActor, issue: IssueType) {
  return isWorkflowManager(actor, issue);
}

export function canEditTesterFields(actor: WorkflowActor, issue: IssueType) {
  if (actor.role === "ADMIN") {
    return isSubtask(issue);
  }

  return (
    isSubtask(issue) &&
    actor.role === "QUALITY_TESTER" &&
    !!actor.userId &&
    issue.assigneeId === actor.userId
  );
}

export function canEditLevelOneFields(actor: WorkflowActor, issue: IssueType) {
  if (actor.role === "ADMIN") {
    return isSubtask(issue);
  }

  return isSubtask(issue) && actor.role === "QUALITY_INSPECTOR_L1";
}

export function canEditLevelTwoFields(actor: WorkflowActor, issue: IssueType) {
  if (actor.role === "ADMIN") {
    return isSubtask(issue);
  }

  return isSubtask(issue) && actor.role === "QUALITY_INSPECTOR_L2";
}

export function canEditComputedFields() {
  return false;
}

export function canTransitionStatus(
  actor: WorkflowActor,
  issue: IssueType,
  targetStatus: IssueStatus
) {
  const currentStatus = issue.status;
  if (currentStatus === targetStatus) return true;

  if (actor.role === "ADMIN") {
    if (targetStatus === "DONE" && isParentTest(issue)) {
      return issue.children.every((child) => child.status === "DONE");
    }

    return true;
  }

  if (isWorkflowManager(actor, issue)) {
    if (
      (currentStatus === "TODO" && targetStatus === "IN_PROGRESS") ||
      (currentStatus === "IN_PROGRESS" && targetStatus === "TODO")
    ) {
      return true;
    }

    if (currentStatus === "INSPECTION_L2" && targetStatus === "DONE") {
      if (isParentTest(issue)) {
        return issue.children.every((child) => child.status === "DONE");
      }
      return true;
    }
  }

  if (actor.role === "QUALITY_TESTER") {
    return (
      (currentStatus === "IN_PROGRESS" && targetStatus === "INSPECTION") ||
      (currentStatus === "INSPECTION" && targetStatus === "IN_PROGRESS")
    );
  }

  if (actor.role === "QUALITY_INSPECTOR_L1") {
    return (
      (currentStatus === "INSPECTION" && targetStatus === "INSPECTION_L2") ||
      (currentStatus === "INSPECTION_L2" && targetStatus === "INSPECTION")
    );
  }

  if (actor.role === "QUALITY_INSPECTOR_L2") {
    return (
      (currentStatus === "INSPECTION_L2" && targetStatus === "INSPECTION") ||
      (currentStatus === "INSPECTION" && targetStatus === "INSPECTION_L2")
    );
  }

  return false;
}

export function getAllowedStatuses(actor: WorkflowActor, issue: IssueType) {
  return BOARD_STATUSES.filter((status) => canTransitionStatus(actor, issue, status));
}