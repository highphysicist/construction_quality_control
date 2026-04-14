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
  const [requestedCountInput, setRequestedCountInput] = useState("1");
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmedName = name.trim();

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

  function getRequestedCount() {
    const parsedCount = Number.parseInt(requestedCountInput, 10);
    return Number.isFinite(parsedCount) && parsedCount > 0 ? parsedCount : 1;
  }

  function updateRequestedCount(nextValue: string) {
    if (nextValue === "") {
      setRequestedCountInput("");
      return;
    }

    if (!/^\d+$/.test(nextValue)) {
      return;
    }

    setRequestedCountInput(nextValue);
  }

  function changeRequestedCount(delta: number) {
    const nextCount = Math.max(1, getRequestedCount() + delta);
    setRequestedCountInput(String(nextCount));
  }

  function handleCreateIssue(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!trimmedName || isCreating) {
        return;
      }

      onCreate({
        name: trimmedName,
        type,
        parentId: parentId ?? null,
        requestedCount: isSubtask ? null : getRequestedCount(),
      });
      setName("");
    }
  }

  return (
    <div
      {...props}
      className={clsx(
        "animate-soft-in rounded-lg border-2 border-blue-400 bg-white p-3 shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-x-2">
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
        <div className="flex min-w-0 flex-1 flex-col">
          <label htmlFor="empty-issue-input" className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {isSubtask ? "Test Instance Name" : "Test Name"}
          </label>
          <input
            ref={inputRef}
            autoFocus
            type="text"
            id="empty-issue-input"
            placeholder="Enter soil moisture test name"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            onKeyDown={handleCreateIssue}
          />
        </div>
      </div>

      {!isSubtask && !isEpic ? (
        <div className="mt-3 flex items-center justify-between gap-x-3 rounded-md bg-slate-50 px-3 py-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Required Test Instances
            </div>
            <div className="text-xs text-slate-500">
              These instances will be created automatically after the test is saved.
            </div>
          </div>
          <div className="flex items-center gap-x-2">
            <Button
              type="button"
              customColors
              className="h-10 w-10 justify-center rounded-md border border-slate-300 bg-white text-lg font-semibold text-slate-700 hover:bg-slate-100"
              onClick={() => changeRequestedCount(-1)}
              disabled={isCreating}
              aria-label="Decrease required test instances"
            >
              -
            </Button>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={requestedCountInput}
              onChange={(e) => updateRequestedCount(e.currentTarget.value)}
              onBlur={() => setRequestedCountInput(String(getRequestedCount()))}
              className="h-10 w-20 rounded-md border border-slate-300 bg-white px-3 py-2 text-center text-base font-semibold text-slate-900"
              aria-label="Number of required test instances"
            />
            <Button
              type="button"
              customColors
              className="h-10 w-10 justify-center rounded-md border border-slate-300 bg-white text-lg font-semibold text-slate-700 hover:bg-slate-100"
              onClick={() => changeRequestedCount(1)}
              disabled={isCreating}
              aria-label="Increase required test instances"
            >
              +
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-end gap-x-2">
        {isCreating ? (
          <div className="flex items-center pr-2">
            <Spinner size="sm" />
          </div>
        ) : null}
        <Button className="shadow-sm" disabled={isCreating} onClick={() => onCancel()}>
          <MdClose className="mr-1 text-sm" />
          <span>Cancel</span>
        </Button>
        <Button
          customColors
          className="bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-300"
          disabled={!trimmedName || isCreating}
          onClick={() =>
            onCreate({
              name: trimmedName,
              type,
              parentId: parentId ?? null,
              requestedCount: isSubtask ? null : getRequestedCount(),
            })
          }
        >
          <MdCheck className="mr-1 text-sm" />
          <span>{isSubtask ? "Create Instance" : "Create Test"}</span>
        </Button>
      </div>
    </div>
  );
};

export { EmtpyIssue };
