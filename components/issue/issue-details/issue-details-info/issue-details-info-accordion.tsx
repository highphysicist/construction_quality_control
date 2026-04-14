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
import { isParentTest, isSubtask } from "@/utils/helpers";
import { SoilMoistureEditorModal } from "./soil-moisture-editor-modal";
import { useCurrentWorkflowActor } from "@/hooks/use-current-workflow-actor";
import {
  canEditLevelOneFields,
  canEditLevelTwoFields,
  canEditTestConfiguration,
  canEditTesterFields,
  canManageAssignee,
} from "@/utils/workflow";

const IssueDetailsInfoAccordion: React.FC<{ issue: IssueType }> = ({
  issue,
}) => {
  const { updateIssue } = useIssues();
  const [isAuthenticated, openAuthModal] = useIsAuthenticated();
  const { sprints } = useSprints();
  const { user } = useUser();
  const [openAccordion, setOpenAccordion] = useState("details");
  const actor = useCurrentWorkflowActor();
  const canEditConfig = canEditTestConfiguration(actor, issue);
  const canAssign = canManageAssignee(actor, issue);
  const canEditSlip = canEditTesterFields(actor, issue);
  const canEditL1 = canEditLevelOneFields(actor, issue);
  const canEditL2 = canEditLevelTwoFields(actor, issue);

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
    requestedCount?: number | null;
    chainage?: string | null;
    truckDetails?: string | null;
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
                disabled={!canAssign}
                customColors
                customPadding
                className="mt-1 hidden text-sm text-blue-600 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 [&[data-state=unassigned]]:flex"
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

      {isParentTest(issue) ? (
        <AccordionItem value={"test-config"}>
          <AccordionTrigger className="flex w-full items-center justify-between p-2 font-medium hover:bg-gray-100 [&[data-state=open]>svg]:rotate-180 [&[data-state=open]]:border-b">
            <div className="flex items-center gap-x-1">
              <span className="text-sm">Test Configuration</span>
              <span className="text-xs text-gray-500">
                (Required instances, chainage, truck details)
              </span>
            </div>
            <FaChevronUp
              className="mr-2 text-xs text-black transition-transform"
              aria-hidden
            />
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-y-3 bg-white px-3 py-3">
            <div className="grid grid-cols-3 items-center gap-2">
              <span className="text-sm font-semibold text-gray-600">
                Required Test Instances
              </span>
              <input
                type="number"
                min={1}
                value={issue.requestedCount ?? 1}
                disabled={!canEditConfig}
                onChange={(e) =>
                  updateMoistureFields({
                    requestedCount: Number(e.currentTarget.value) || 1,
                  })
                }
                className="col-span-2 rounded border px-2 py-1 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div className="grid grid-cols-3 items-center gap-2 rounded bg-slate-50 px-2 py-1.5">
              <span className="text-sm font-semibold text-gray-600">
                Existing Test Instances
              </span>
              <span className="col-span-2 text-sm text-slate-700">
                {issue.children.length}
              </span>
            </div>

            <div className="grid grid-cols-3 items-center gap-2">
              <span className="text-sm font-semibold text-gray-600">Chainage</span>
              <input
                value={issue.chainage ?? ""}
                disabled={!canEditConfig}
                onChange={(e) =>
                  updateMoistureFields({ chainage: e.currentTarget.value || null })
                }
                placeholder="0+120 to 0+180"
                className="col-span-2 rounded border px-2 py-1 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div className="grid grid-cols-3 items-start gap-2">
              <span className="pt-1 text-sm font-semibold text-gray-600">
                Truck Details
              </span>
              <textarea
                value={issue.truckDetails ?? ""}
                disabled={!canEditConfig}
                onChange={(e) =>
                  updateMoistureFields({ truckDetails: e.currentTarget.value || null })
                }
                rows={2}
                className="col-span-2 rounded border px-2 py-1 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      ) : null}

      {isSubtask(issue) ? (
        <AccordionItem value={"soil-moisture"}>
          <AccordionTrigger className="flex w-full items-center justify-between p-2 font-medium hover:bg-gray-100 [&[data-state=open]>svg]:rotate-180 [&[data-state=open]]:border-b">
            <div className="flex items-center gap-x-1">
              <span className="text-sm">Soil Moisture Test Slip</span>
              <span className="text-xs text-gray-500">
                (Weights, approvals, signatures)
              </span>
            </div>
            <FaChevronUp
              className="mr-2 text-xs text-black transition-transform"
              aria-hidden
            />
          </AccordionTrigger>
          <AccordionContent className="bg-white px-3 py-3">
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Test Instance Snapshot
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <SummaryPill
                        label="Initial"
                        value={
                          issue.initialWeight == null
                            ? "-"
                            : `${issue.initialWeight.toFixed(3)} g`
                        }
                      />
                      <SummaryPill
                        label="Final"
                        value={
                          issue.finalWeight == null
                            ? "-"
                            : `${issue.finalWeight.toFixed(3)} g`
                        }
                      />
                      <SummaryPill
                        label="Sample"
                        value={issue.sampleLabel ?? "Not set"}
                      />
                      <SummaryPill
                        label="Moisture Loss"
                        value={
                          issue.moistureWeight == null
                            ? "-"
                            : `${issue.moistureWeight.toFixed(3)} g`
                        }
                      />
                      <SummaryPill
                        label="Moisture %"
                        value={
                          issue.moisturePct == null
                            ? "-"
                            : `${issue.moisturePct.toFixed(3)}%`
                        }
                      />
                    </div>
                </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <PermissionPill
                      label="Tester"
                      active={canEditSlip}
                      inactiveLabel="Read only"
                    />
                    <PermissionPill
                      label="L1"
                      active={canEditL1}
                      inactiveLabel="Read only"
                    />
                    <PermissionPill
                      label="L2"
                      active={canEditL2}
                      inactiveLabel="Read only"
                    />
                    <SoilMoistureEditorModal
                      issue={issue}
                      onUpdate={updateMoistureFields}
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                  <ReviewCard
                    title="Inspection L1"
                    status={issue.levelOneStatus}
                    note={issue.levelOneNote}
                    editable={canEditL1}
                  />
                  <ReviewCard
                    title="Inspection L2"
                    status={issue.levelTwoStatus}
                    note={issue.levelTwoNote}
                    editable={canEditL2}
                  />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      ) : null}
    </Accordion>
  );
};

const SummaryPill: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => {
  return (
    <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
      <span className="mr-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
};

const ReviewCard: React.FC<{
  title: string;
  status: WorkflowReviewStatus;
  note: string | null;
  editable: boolean;
}> = ({ title, status, note, editable }) => {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-x-3">
        <span className="text-sm font-semibold text-slate-800">{title}</span>
        <div className="flex items-center gap-2">
          <span
            className={
              editable
                ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
            }
          >
            {editable ? "Editable" : "Read only"}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {status}
          </span>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        {note?.trim() || "No inspection note added yet."}
      </p>
    </div>
  );
};

const PermissionPill: React.FC<{
  label: string;
  active: boolean;
  inactiveLabel: string;
}> = ({ label, active, inactiveLabel }) => {
  return (
    <div
      className={
        active
          ? "rounded-full bg-emerald-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700"
          : "rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600"
      }
    >
      {label}: {active ? "Editable" : inactiveLabel}
    </div>
  );
};

export { IssueDetailsInfoAccordion };
