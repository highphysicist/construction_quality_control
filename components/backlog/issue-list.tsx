"use client";
import { useState } from "react";
import { useIssues } from "@/hooks/query-hooks/use-issues";
import { Droppable } from "react-beautiful-dnd";
import { AccordionContent } from "../ui/accordion";
import { Issue } from "./issue";
import { Button } from "../ui/button";
import { AiOutlinePlus } from "react-icons/ai";
import { EmtpyIssue } from "../issue/issue-empty";
import { type IssueType } from "@/utils/types";
import clsx from "clsx";
import { useUser } from "@clerk/clerk-react";
import { useStrictModeDroppable } from "@/hooks/use-strictmode-droppable";
import { useIsAuthenticated } from "@/hooks/use-is-authed";
import { IssueIcon } from "../issue/issue-icon";
import { useSelectedIssueContext } from "@/context/use-selected-issue-context";
import {
  getIssueTypeLabel,
  getWorkflowTypeLabel,
  isSubtask,
} from "@/utils/helpers";
import { IssueAssigneeSelect } from "../issue/issue-select-assignee";
import { IssueSelectStatus } from "../issue/issue-select-status";

const IssueList: React.FC<{ sprintId: string | null; issues: IssueType[] }> = ({
  sprintId,
  issues,
}) => {
  const { createIssue, isCreating } = useIssues();
  const { user } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [droppableEnabled] = useStrictModeDroppable();
  const [isAuthenticated, openAuthModal] = useIsAuthenticated();
  const { setIssueKey } = useSelectedIssueContext();

  if (!droppableEnabled) {
    return null;
  }

  function handleCreateIssue({
    name,
    type,
  }: {
    name: string;
    type: IssueType["type"];
  }) {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    if (!name) {
      return;
    }

    createIssue(
      {
        name,
        type,
        parentId: null,
        sprintId,
        reporterId: user?.id ?? null,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  }
  return (
    <AccordionContent className="pt-2">
      <Droppable droppableId={sprintId ?? "backlog"}>
        {({ droppableProps, innerRef, placeholder }) => (
          <div
            {...droppableProps}
            ref={innerRef}
            className={clsx(issues.length == 0 && "min-h-[1px]")}
          >
            <div
              className={clsx(issues.length && "border-[0.3px]", "divide-y ")}
            >
              <GroupedBacklogIssues
                issues={issues}
                onSelectIssue={(issueKey) => setIssueKey(issueKey)}
              />
            </div>
            {placeholder}
          </div>
        )}
      </Droppable>

      <Button
        onClick={() => setIsEditing(true)}
        data-state={isEditing ? "closed" : "open"}
        customColors
        className="my-1 flex w-full bg-transparent hover:bg-gray-200 [&[data-state=closed]]:hidden"
      >
        <AiOutlinePlus className="text-sm" />
        <span className="text-sm">Create Test</span>
      </Button>

      <EmtpyIssue
        data-state={isEditing ? "open" : "closed"}
        className="[&[data-state=closed]]:hidden"
        onCreate={({ name, type }) => handleCreateIssue({ name, type })}
        onCancel={() => setIsEditing(false)}
        isCreating={isCreating}
      />
    </AccordionContent>
  );
};

const GroupedBacklogIssues: React.FC<{
  issues: IssueType[];
  onSelectIssue: (issueKey: string) => void;
}> = ({ issues, onSelectIssue }) => {
  const sortedIssues = [...issues].sort(
    (a, b) => a.sprintPosition - b.sprintPosition
  );
  const parentIssues = sortedIssues.filter((issue) => !issue.parentId);
  const childIssues = sortedIssues.filter((issue) => isSubtask(issue));
  const parentIssueIds = new Set(parentIssues.map((issue) => issue.id));
  const childrenByParent = new Map<string, IssueType[]>();

  childIssues.forEach((issue) => {
    const parentId = issue.parentId;
    if (!parentId) return;
    const children = childrenByParent.get(parentId) ?? [];
    children.push(issue);
    childrenByParent.set(parentId, children);
  });

  let index = 0;

  return (
    <>
      {parentIssues.map((issue) => {
        const children = childrenByParent.get(issue.id) ?? [];

        return (
          <div
            key={issue.id}
            className="border-b last:border-b-0"
          >
            <Issue index={index++} issue={issue} />
            {children.length ? (
              <div className="border-l-2 border-slate-200 bg-slate-50/70 pl-6">
                {children.map((child) => (
                  <ChildIssueRow
                    key={child.id}
                    issue={child}
                    onSelectIssue={onSelectIssue}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
      {childIssues
        .filter((issue) => !issue.parentId || !parentIssueIds.has(issue.parentId))
        .map((issue) => (
          <ChildIssueRow
            key={issue.id}
            issue={issue}
            onSelectIssue={onSelectIssue}
          />
        ))}
    </>
  );
};

const ChildIssueRow: React.FC<{
  issue: IssueType;
  onSelectIssue: (issueKey: string) => void;
}> = ({ issue, onSelectIssue }) => {
  return (
    <div
      role="button"
      onClick={() => onSelectIssue(issue.key)}
      className="group flex items-center justify-between gap-x-3 px-3 py-2 text-sm hover:bg-slate-100"
    >
      <div className="flex min-w-0 items-center gap-x-2">
        <IssueIcon issueType={issue.type} />
        <span className="text-gray-500">{issue.key}</span>
        <span className="truncate">{issue.name}</span>
        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
          {getIssueTypeLabel(issue.type)}
        </span>
        <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
          {getWorkflowTypeLabel()}
        </span>
        {issue.sampleLabel ? (
          <span className="text-xs text-gray-500">{issue.sampleLabel}</span>
        ) : null}
        {typeof issue.moisturePct === "number" ? (
          <span className="text-xs text-gray-500">
            {issue.moisturePct.toFixed(2)}% moisture
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-x-2">
        <IssueSelectStatus currentStatus={issue.status} issueId={issue.id} />
        <IssueAssigneeSelect issue={issue} avatarOnly />
      </div>
    </div>
  );
};

export { IssueList };
