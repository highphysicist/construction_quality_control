"use client";
import React from "react";
import { useState } from "react";
import { useFiltersContext } from "@/context/use-filters-context";
import { type Project } from "@prisma/client";
import { EpicFilter } from "@/components/filter-epic";
import { IssueTypeFilter } from "@/components/filter-issue-type";
import { SearchBar } from "@/components/filter-search-bar";
import { Members } from "../members";
import { ClearFilters } from "../filter-issue-clear";
import { NotImplemented } from "../not-implemented";
import { Button } from "../ui/button";
import { BiLineChart } from "react-icons/bi";
import { AiOutlinePlus } from "react-icons/ai";
import { EmtpyIssue } from "../issue/issue-empty";
import { useIssues } from "@/hooks/query-hooks/use-issues";
import { useUser } from "@clerk/clerk-react";
import { useIsAuthenticated } from "@/hooks/use-is-authed";
import { useCurrentWorkflowActor } from "@/hooks/use-current-workflow-actor";
import { canCreateTest } from "@/utils/workflow";

const BacklogHeader: React.FC<{ project: Project }> = ({ project }) => {
  const { search, setSearch } = useFiltersContext();
  const { createIssue, isCreating } = useIssues();
  const { user } = useUser();
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [isAuthenticated, openAuthModal] = useIsAuthenticated();
  const actor = useCurrentWorkflowActor();
  const canCreate = canCreateTest(actor);

  function handleCreateTest(name: string, requestedCount?: number | null) {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    if (!name) return;

    createIssue(
      {
        name,
        type: "TASK",
        parentId: null,
        sprintId: null,
        reporterId: user?.id ?? null,
        requestedCount: requestedCount ?? 1,
      },
      {
        onSuccess: () => setIsCreatingTest(false),
      }
    );
  }

  return (
    <div className="flex h-fit flex-col">
      <div className="text-sm text-gray-500">Projects / {project.name}</div>
      <div className="flex items-center justify-between gap-x-4">
        <h1>Test backlog</h1>
        <Button
          onClick={() => setIsCreatingTest(true)}
          data-state={isCreatingTest ? "closed" : "open"}
          disabled={!canCreate}
          className="flex items-center gap-x-2 [&[data-state=closed]]:hidden"
        >
          <AiOutlinePlus className="text-sm" />
          <span>Create Test</span>
        </Button>
      </div>
      <div className="my-3 flex items-center justify-between">
        <div className="flex items-center gap-x-5">
          <SearchBar search={search} setSearch={setSearch} />
          <Members />
          <EpicFilter />
          <IssueTypeFilter />
          <ClearFilters />
        </div>
        <NotImplemented feature="insights">
          <Button className="flex items-center gap-x-2">
            <BiLineChart className="text-gray-900" />
            <span className="text-sm text-gray-900">Insights</span>
          </Button>
        </NotImplemented>
      </div>
      {canCreate ? (
        <EmtpyIssue
          data-state={isCreatingTest ? "open" : "closed"}
          className="mb-2 [&[data-state=closed]]:hidden"
          onCreate={({ name, requestedCount }) =>
            handleCreateTest(name, requestedCount)
          }
          onCancel={() => setIsCreatingTest(false)}
          isCreating={isCreating}
        />
      ) : null}
    </div>
  );
};

export { BacklogHeader };
