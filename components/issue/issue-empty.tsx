"use client";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { IssueSelectType } from "./issue-select-type";
import { Button } from "../ui/button";
import { MdCheck, MdClose } from "react-icons/md";
import { Spinner } from "../ui/spinner";
import { type IssueType } from "@/utils/types";
import { IssueIcon } from "./issue-icon";

const EmtpyIssue: React.FC<{
  className?: string;
  onCreate: (payload: {
    name: string;
    type: IssueType["type"];
    parentId: IssueType["id"] | null;
    requestedCount?: number | null;
  }) => void;
  onCancel: () => void;
  isCreating: boolean;
  isSubtask?: boolean;
  isEpic?: boolean;
  parentId?: IssueType["id"];
}> = ({
  onCreate,
  onCancel,
  isCreating,
  className,
  isEpic,
  isSubtask,
  parentId,
  ...props
}) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<IssueType["type"]>(() => initialType());
  const [requestedCount, setRequestedCount] = useState<number>(1);
  const inputRef = useRef<HTMLInputElement>(null);

  function initialType() {
    if (isSubtask) return "SUBTASK";
    if (isEpic) return "EPIC";
    return "TASK";
  }

  useEffect(() => {
    focusInput();
  }, [props]);

  function focusInput() {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }

  function handleSelect(type: IssueType["type"]) {
    setType(type);
    setTimeout(() => focusInput(), 50);
  }
  function handleCreateIssue(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!name) {
        return;
      }

      onCreate({
        name,
        type,
        parentId: parentId ?? null,
        requestedCount: isSubtask ? null : requestedCount,
      });
      setName("");
    }
  }

  return (
    <div
      {...props}
      className={clsx(
        "relative flex items-center gap-x-2 border-2 border-blue-400 bg-white p-1.5",
        className
      )}
    >
      {isSubtask ? (
        <div className="py-4" />
      ) : isEpic ? (
        <IssueIcon issueType="EPIC" />
      ) : (
        <IssueSelectType
          currentType={type}
          dropdownIcon
          onSelect={handleSelect}
        />
      )}
      <label htmlFor="empty-issue-input" className="sr-only">
        Empty issue input
      </label>
      <input
        ref={inputRef}
        autoFocus
        type="text"
        id="empty-issue-input"
        placeholder="Create soil moisture test or sample instance"
        className=" w-full pl-2 pr-20 text-sm focus:outline-none"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        onKeyDown={handleCreateIssue}
      />
      {!isSubtask && !isEpic ? (
        <input
          type="number"
          min={1}
          value={requestedCount}
          onChange={(e) => setRequestedCount(Number(e.currentTarget.value) || 1)}
          className="w-20 rounded border px-2 py-1 text-sm"
          aria-label="Number of required test instances"
        />
      ) : null}
      {isCreating ? (
        <div className="absolute right-2 z-10">
          <Spinner size="sm" />
        </div>
      ) : (
        <div className="absolute right-2 z-10 flex gap-x-1">
          <Button
            className="aspect-square shadow-md"
            onClick={() => onCancel()}
          >
            <MdClose className="text-sm" />
          </Button>
          <Button
            className="aspect-square shadow-md"
            onClick={() =>
              onCreate({
                name,
                type,
                parentId: parentId ?? null,
                requestedCount: isSubtask ? null : requestedCount,
              })
            }
          >
            <MdCheck className="text-sm" />
          </Button>
        </div>
      )}
    </div>
  );
};

export { EmtpyIssue };
