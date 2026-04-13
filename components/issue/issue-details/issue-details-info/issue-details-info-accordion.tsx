import { useUser } from "@clerk/nextjs";
import { FaChevronUp } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { type IssueType } from "@/utils/types";
import { type WorkflowReviewStatus } from "@prisma/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar } from "@/components/avatar";
import { useSprints } from "@/hooks/query-hooks/use-sprints";
import { IssueAssigneeSelect } from "../../issue-select-assignee";
import { useIssues } from "@/hooks/query-hooks/use-issues";
import { useIsAuthenticated } from "@/hooks/use-is-authed";

const REVIEW_OPTIONS: WorkflowReviewStatus[] = ["PENDING", "OK", "NOT_OK"];

const IssueDetailsInfoAccordion: React.FC<{ issue: IssueType }> = ({
  issue,
}) => {
  const { updateIssue } = useIssues();
  const [isAuthenticated, openAuthModal] = useIsAuthenticated();
  const { sprints } = useSprints();
  const { user } = useUser();
  const [openAccordion, setOpenAccordion] = useState("details");

  function handleAutoAssign() {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    updateIssue({
      issueId: issue.id,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      assigneeId: user!.id,
    });
  }

  function updateMoistureFields(payload: {
    initialWeight?: number | null;
    finalWeight?: number | null;
    sampleLabel?: string | null;
    levelOneStatus?: WorkflowReviewStatus;
    levelOneNote?: string | null;
    levelTwoStatus?: WorkflowReviewStatus;
    levelTwoNote?: string | null;
  }) {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    updateIssue({
      issueId: issue.id,
      ...payload,
    });
  }

  return (
    <Accordion
      onValueChange={setOpenAccordion}
      value={openAccordion}
      className="my-3 w-min min-w-full rounded-[3px] border"
      type="single"
      collapsible
    >
      <AccordionItem value={"details"}>
        <AccordionTrigger className="flex w-full items-center justify-between p-2 font-medium hover:bg-gray-100 [&[data-state=open]>svg]:rotate-180 [&[data-state=open]]:border-b">
          <div className="flex items-center gap-x-1">
            <span className="text-sm">Details</span>
            <span className="text-xs text-gray-500">
              (Assignee, Sprint, Reporter)
            </span>
          </div>
          <FaChevronUp
            className="mr-2 text-xs text-black transition-transform"
            aria-hidden
          />
        </AccordionTrigger>
        <AccordionContent className="flex flex-col bg-white px-3 [&[data-state=open]]:py-2">
          <div
            data-state={issue.assignee ? "assigned" : "unassigned"}
            className="my-2 grid grid-cols-3 [&[data-state=assigned]]:items-center"
          >
            <span className="text-sm font-semibold text-gray-600">
              Assignee
            </span>
            <div className="flex flex-col">
              <IssueAssigneeSelect issue={issue} />
              <Button
                onClick={handleAutoAssign}
                data-state={issue.assignee ? "assigned" : "unassigned"}
                customColors
                customPadding
                className="mt-1 hidden text-sm text-blue-600 underline-offset-2 hover:underline [&[data-state=unassigned]]:flex"
              >
                Assign to me
              </Button>
            </div>
          </div>
          <div className="my-4 grid grid-cols-3 items-center">
            <span className="text-sm font-semibold text-gray-600">Sprint</span>
            <div className="flex items-center">
              <span className="text-sm text-gray-700">
                {sprints?.find((sprint) => sprint?.id == issue.sprintId)
                  ?.name ?? "None"}
              </span>
            </div>
          </div>
          <div className="my-2 grid grid-cols-3  items-center">
            <span className="text-sm font-semibold text-gray-600">
              Reporter
            </span>
            <div className="flex items-center gap-x-3 ">
              <Avatar
                src={issue.reporter?.avatar}
                alt={`${issue.reporter?.name ?? "Unassigned"}`}
              />
              <span className="whitespace-nowrap text-sm">
                {issue.reporter?.name}
              </span>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value={"soil-moisture"}>
        <AccordionTrigger className="flex w-full items-center justify-between p-2 font-medium hover:bg-gray-100 [&[data-state=open]>svg]:rotate-180 [&[data-state=open]]:border-b">
          <div className="flex items-center gap-x-1">
            <span className="text-sm">Soil Moisture Test Slip</span>
            <span className="text-xs text-gray-500">
              (Inputs, computed values, inspections)
            </span>
          </div>
          <FaChevronUp
            className="mr-2 text-xs text-black transition-transform"
            aria-hidden
          />
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-y-3 bg-white px-3 py-3">
          <div className="grid grid-cols-3 items-center gap-2">
            <span className="text-sm font-semibold text-gray-600">Sample ID</span>
            <input
              value={issue.sampleLabel ?? ""}
              onChange={(e) =>
                updateMoistureFields({ sampleLabel: e.currentTarget.value || null })
              }
              placeholder="Sample A"
              className="col-span-2 rounded border px-2 py-1 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 items-center gap-2">
            <span className="text-sm font-semibold text-gray-600">
              Initial Weight (g)
            </span>
            <input
              type="number"
              step="0.001"
              value={issue.initialWeight ?? ""}
              onChange={(e) =>
                updateMoistureFields({
                  initialWeight:
                    e.currentTarget.value === ""
                      ? null
                      : Number(e.currentTarget.value),
                })
              }
              className="col-span-2 rounded border px-2 py-1 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 items-center gap-2">
            <span className="text-sm font-semibold text-gray-600">
              Final Weight (g)
            </span>
            <input
              type="number"
              step="0.001"
              value={issue.finalWeight ?? ""}
              onChange={(e) =>
                updateMoistureFields({
                  finalWeight:
                    e.currentTarget.value === ""
                      ? null
                      : Number(e.currentTarget.value),
                })
              }
              className="col-span-2 rounded border px-2 py-1 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 items-center gap-2 rounded bg-slate-50 px-2 py-1.5">
            <span className="text-sm font-semibold text-gray-600">Moisture Loss</span>
            <span className="col-span-2 text-sm text-slate-700">
              {issue.moistureWeight == null ? "-" : `${issue.moistureWeight.toFixed(3)} g`}
            </span>
          </div>

          <div className="grid grid-cols-3 items-center gap-2 rounded bg-slate-50 px-2 py-1.5">
            <span className="text-sm font-semibold text-gray-600">Moisture %</span>
            <span className="col-span-2 text-sm text-slate-700">
              {issue.moisturePct == null ? "-" : `${issue.moisturePct.toFixed(3)}%`}
            </span>
          </div>

          <div className="grid grid-cols-3 items-center gap-2">
            <span className="text-sm font-semibold text-gray-600">Inspection L1</span>
            <select
              value={issue.levelOneStatus}
              onChange={(e) =>
                updateMoistureFields({
                  levelOneStatus: e.currentTarget.value as WorkflowReviewStatus,
                })
              }
              className="col-span-2 rounded border px-2 py-1 text-sm"
            >
              {REVIEW_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 items-start gap-2">
            <span className="pt-1 text-sm font-semibold text-gray-600">
              L1 Comment
            </span>
            <textarea
              value={issue.levelOneNote ?? ""}
              onChange={(e) =>
                updateMoistureFields({ levelOneNote: e.currentTarget.value || null })
              }
              rows={2}
              className="col-span-2 rounded border px-2 py-1 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 items-center gap-2">
            <span className="text-sm font-semibold text-gray-600">Inspection L2</span>
            <select
              value={issue.levelTwoStatus}
              onChange={(e) =>
                updateMoistureFields({
                  levelTwoStatus: e.currentTarget.value as WorkflowReviewStatus,
                })
              }
              className="col-span-2 rounded border px-2 py-1 text-sm"
            >
              {REVIEW_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 items-start gap-2">
            <span className="pt-1 text-sm font-semibold text-gray-600">
              L2 Comment
            </span>
            <textarea
              value={issue.levelTwoNote ?? ""}
              onChange={(e) =>
                updateMoistureFields({ levelTwoNote: e.currentTarget.value || null })
              }
              rows={2}
              className="col-span-2 rounded border px-2 py-1 text-sm"
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export { IssueDetailsInfoAccordion };
