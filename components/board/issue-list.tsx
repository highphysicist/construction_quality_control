import { useStrictModeDroppable } from "@/hooks/use-strictmode-droppable";
import { type IssueType } from "@/utils/types";
import { Droppable } from "react-beautiful-dnd";
import { Issue } from "./issue";
import clsx from "clsx";
import { statusMap } from "../issue/issue-select-status";
import { type IssueStatus } from "@prisma/client";
import { getPluralEnd } from "@/utils/helpers";

const IssueList: React.FC<{ status: IssueStatus; issues: IssueType[] }> = ({
  status,
  issues,
}) => {
  const [droppableEnabled] = useStrictModeDroppable();

  if (!droppableEnabled) {
    return null;
  }

  return (
    <div
      className={clsx(
        "mb-5 h-max min-h-fit w-[350px] rounded-md bg-gray-100 px-1.5  pb-3"
      )}
    >
      <h2 className="sticky top-0 -mx-1.5 -mt-1.5 mb-1.5 rounded-t-md bg-gray-100 px-2 py-3 text-xs text-gray-500">
        {statusMap[status]}{" "}
        {issues.filter((issue) => issue.status == status).length}
        {` ITEM${getPluralEnd(issues).toUpperCase()}`}
      </h2>

      <Droppable droppableId={status}>
        {({ droppableProps, innerRef, placeholder }) => (
          <div
            {...droppableProps}
            ref={innerRef}
            className=" h-fit min-h-[10px]"
          >
            <GroupedIssues issues={issues} />
            {placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

const GroupedIssues: React.FC<{ issues: IssueType[] }> = ({ issues }) => {
  const parents = issues.filter((issue) => !issue.parentId);
  const childrenByParent = new Map<string, IssueType[]>();

  issues
    .filter((issue) => Boolean(issue.parentId))
    .forEach((issue) => {
      const parentId = issue.parentId as string;
      const current = childrenByParent.get(parentId) ?? [];
      current.push(issue);
      childrenByParent.set(parentId, current);
    });

  let index = 0;
  const nodes: React.ReactNode[] = [];

  parents.forEach((parent) => {
    const children = childrenByParent.get(parent.id) ?? [];
    nodes.push(
      <div
        key={`group-${parent.id}`}
        className="mb-2 rounded-md border border-slate-300 bg-slate-50/60 p-1"
      >
        <Issue issue={parent} index={index++} variant="parent" />
        {children.length ? (
          <div className="mt-1 flex flex-col gap-1 border-l-2 border-slate-300 pl-2">
            {children.map((child) => (
              <Issue
                key={child.id}
                issue={child}
                index={index++}
                variant="child"
              />
            ))}
          </div>
        ) : null}
      </div>
    );
    childrenByParent.delete(parent.id);
  });

  Array.from(childrenByParent.values())
    .flat()
    .forEach((orphan) => {
      nodes.push(
        <Issue key={orphan.id} issue={orphan} index={index++} variant="child" />
      );
    });

  return <>{nodes}</>;
};

export { IssueList };
