import { type IssueType } from "@/utils/types";
import clsx from "clsx";
import { Draggable } from "react-beautiful-dnd";
import { IssueIcon } from "../issue/issue-icon";
import { Avatar } from "../avatar";
import { IssueDropdownMenu } from "../issue/issue-menu";
import { DropdownTrigger } from "../ui/dropdown-menu";
import { BsThreeDots } from "react-icons/bs";
import { isEpic } from "@/utils/helpers";
import { EpicName } from "../backlog/issue";

import { useSelectedIssueContext } from "@/context/use-selected-issue-context";

const Issue: React.FC<{
  issue: IssueType;
  index: number;
  variant?: "parent" | "child";
}> = ({
  issue,
  index,
  variant = "parent",
}) => {
  const { setIssueKey } = useSelectedIssueContext();

  const isChild = variant === "child";

  const moistureWeight =
    issue.moistureWeight == null ? "-" : `${issue.moistureWeight.toFixed(2)} g`;
  const moisturePct =
    issue.moisturePct == null ? "-" : `${issue.moisturePct.toFixed(2)}%`;

  return (
    <Draggable draggableId={issue.id} index={index}>
      {({ innerRef, dragHandleProps, draggableProps }, { isDragging }) => (
        <div
          role="button"
          onClick={() => setIssueKey(issue.key)}
          ref={innerRef}
          {...draggableProps}
          {...dragHandleProps}
          className={clsx(
            isDragging && "bg-white",
            isChild ? "ml-0" : "",
            "surface-motion group my-0.5 max-w-full rounded-[3px] border-[0.3px] border-gray-300 bg-white p-2 text-sm shadow-sm shadow-gray-300 hover:-translate-y-0.5 hover:bg-gray-200 hover:shadow-md"
          )}
        >
          <div className="flex items-start justify-between">
            <span className="mb-2">{issue.name}</span>
            <IssueDropdownMenu issue={issue}>
              <DropdownTrigger
                asChild
                className="rounded-m flex h-fit items-center gap-x-2 bg-opacity-30 px-1.5 text-xs font-semibold focus:ring-2"
              >
                <div className="invisible rounded-sm px-1.5 py-1.5 text-gray-700 group-hover:visible group-hover:bg-gray-100 group-hover:hover:bg-gray-300 [&[data-state=open]]:visible [&[data-state=open]]:bg-gray-700 [&[data-state=open]]:text-white">
                  <BsThreeDots className="sm:text-xl" />
                </div>
              </DropdownTrigger>
            </IssueDropdownMenu>
          </div>
          <div className="w-fit">
            {isEpic(issue.parent) ? (
              <EpicName issue={issue.parent} className="py-0.5 text-sm" />
            ) : null}
          </div>
          {isChild ? (
            <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
              <span>Moisture Loss: {moistureWeight}</span>
              <span className="ml-3">Moisture %: {moisturePct}</span>
            </div>
          ) : null}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-x-3">
              <IssueIcon issueType={issue.type} />
              <span className="text-xs font-medium text-gray-600">
                {issue.key}
              </span>
            </div>
            <Avatar
              size={20}
              src={issue.assignee?.avatar}
              alt={issue.assignee?.name ?? "Unassigned"}
            />
          </div>
        </div>
      )}
    </Draggable>
  );
};

export { Issue };
