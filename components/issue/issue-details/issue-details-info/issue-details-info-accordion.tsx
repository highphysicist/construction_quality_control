import { useUser } from "@clerk/nextjs";
import { FaChevronUp } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
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
import { dateToLongString, isParentTest, isSubtask } from "@/utils/helpers";
import { SoilMoistureEditorModal } from "./soil-moisture-editor-modal";
import { useCurrentWorkflowActor } from "@/hooks/use-current-workflow-actor";
import {
  canEditLevelOneFields,
  canEditLevelTwoFields,
  canEditTestConfiguration,
  canEditTesterFields,
  canManageAssignee,
} from "@/utils/workflow";

const REVIEW_OPTIONS: WorkflowReviewStatus[] = ["PENDING", "OK", "NOT_OK"];

const IssueDetailsInfoAccordion: React.FC<{ issue: IssueType }> = ({ issue }) => {
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

  function requireAuth() {
    if (!isAuthenticated) {
      openAuthModal();
      return false;
    }

    return true;
  }

  function handleAutoAssign() {
    if (!requireAuth() || !user?.id) return;

    updateIssue({
      issueId: issue.id,
      assigneeId: user.id,
    });
  }
  
  function updateIssueFields(payload: {
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
    if (!requireAuth()) return;

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
      <AccordionItem value="details">
        <AccordionTrigger className="flex w-full items-center justify-between p-2 font-medium hover:bg-gray-100 [&[data-state=open]>svg]:rotate-180 [&[data-state=open]]:border-b">
          <div className="flex items-center gap-x-1">
            <span className="text-sm">Details</span>
            <span className="text-xs text-gray-500">(Assignee, Sprint, Reporter)</span>
          </div>
          <FaChevronUp className="mr-2 text-xs text-black transition-transform" aria-hidden />
        </AccordionTrigger>
        <AccordionContent className="flex flex-col bg-white px-3 [&[data-state=open]]:py-2">
          <div
            data-state={issue.assignee ? "assigned" : "unassigned"}
            className="my-2 grid grid-cols-3 [&[data-state=assigned]]:items-center"
          >
            <span className="text-sm font-semibold text-gray-600">Assignee</span>
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
                {sprints?.find((sprint) => sprint?.id === issue.sprintId)?.name ?? "None"}
              </span>
            </div>
          </div>

          <div className="my-2 grid grid-cols-3 items-center">
            <span className="text-sm font-semibold text-gray-600">Reporter</span>
            <div className="flex items-center gap-x-3">
              <Avatar
                src={issue.reporter?.avatar}
                alt={`${issue.reporter?.name ?? "Unassigned"}`}
              />
              <span className="whitespace-nowrap text-sm">{issue.reporter?.name}</span>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {isParentTest(issue) ? (
        <AccordionItem value="test-config">
          <AccordionTrigger className="flex w-full items-center justify-between p-2 font-medium hover:bg-gray-100 [&[data-state=open]>svg]:rotate-180 [&[data-state=open]]:border-b">
            <div className="flex items-center gap-x-1">
              <span className="text-sm">Test Configuration</span>
              <span className="text-xs text-gray-500">(Required instances, chainage, truck details)</span>
            </div>
            <FaChevronUp className="mr-2 text-xs text-black transition-transform" aria-hidden />
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-y-3 bg-white px-3 py-3">
            <div className="grid grid-cols-3 items-center gap-2">
              <span className="text-sm font-semibold text-gray-600">Required Test Instances</span>
              <input
                type="number"
                min={1}
                value={issue.requestedCount ?? 1}
                disabled={!canEditConfig}
                onChange={(e) =>
                  updateIssueFields({
                    requestedCount: Number(e.currentTarget.value) || 1,
                  })
                }
                className="col-span-2 rounded border px-2 py-1 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div className="grid grid-cols-3 items-center gap-2 rounded bg-slate-50 px-2 py-1.5">
              <span className="text-sm font-semibold text-gray-600">Existing Test Instances</span>
              <span className="col-span-2 text-sm text-slate-700">{issue.children.length}</span>
            </div>

            <div className="grid grid-cols-3 items-center gap-2">
              <span className="text-sm font-semibold text-gray-600">Chainage</span>
              <input
                value={issue.chainage ?? ""}
                disabled={!canEditConfig}
                onChange={(e) => updateIssueFields({ chainage: e.currentTarget.value || null })}
                placeholder="0+120 to 0+180"
                className="col-span-2 rounded border px-2 py-1 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div className="grid grid-cols-3 items-start gap-2">
              <span className="pt-1 text-sm font-semibold text-gray-600">Truck Details</span>
              <textarea
                value={issue.truckDetails ?? ""}
                disabled={!canEditConfig}
                onChange={(e) => updateIssueFields({ truckDetails: e.currentTarget.value || null })}
                rows={2}
                className="col-span-2 rounded border px-2 py-1 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      ) : null}

      {isSubtask(issue) ? (
        <AccordionItem value="soil-moisture">
          <AccordionTrigger className="flex w-full items-center justify-between p-2 font-medium hover:bg-gray-100 [&[data-state=open]>svg]:rotate-180 [&[data-state=open]]:border-b">
            <div className="flex items-center gap-x-1">
              <span className="text-sm">Soil Moisture Test Slip</span>
              <span className="text-xs text-gray-500">(Weights, approvals, signatures)</span>
            </div>
            <FaChevronUp className="mr-2 text-xs text-black transition-transform" aria-hidden />
          </AccordionTrigger>
          <AccordionContent className="bg-white px-3 py-3">
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Test Slip Summary
                  </div>
                  <div className="text-sm text-slate-600">
                    Enter tester weights in the slip editor, then save to compute moisture loss and percentage. Inspection approvals are saved separately below.
                  </div>
                </div>

                <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
                  <SummaryRow label="Sample ID" value={issue.sampleLabel?.trim() || "Not set"} />
                  <SummaryRow
                    label="Initial Weight"
                    value={
                      issue.initialWeight == null
                        ? "Not recorded"
                        : `${issue.initialWeight.toFixed(3)} g`
                    }
                  />
                  <SummaryRow
                    label="Final Weight"
                    value={
                      issue.finalWeight == null
                        ? "Not recorded"
                        : `${issue.finalWeight.toFixed(3)} g`
                    }
                  />
                  <SummaryRow
                    label="Moisture Loss"
                    value={
                      issue.moistureWeight == null
                        ? "Calculated after weights are entered"
                        : `${issue.moistureWeight.toFixed(3)} g`
                    }
                  />
                  <SummaryRow
                    label="Moisture %"
                    value={
                      issue.moisturePct == null
                        ? "Calculated after weights are entered"
                        : `${issue.moisturePct.toFixed(3)}%`
                    }
                  />
                  <SummaryRow
                    label="Slip Recorded"
                    value={
                      issue.testerRecordedAt
                        ? dateToLongString(issue.testerRecordedAt)
                        : "Not recorded"
                    }
                  />
                </div>

                <SoilMoistureEditorModal
                  issue={issue}
                  onUpdate={updateIssueFields}
                  triggerLabel={canEditSlip ? "Open Soil Moisture Slip Editor" : "View Soil Moisture Slip"}
                  triggerClassName="w-full justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                />

                <div className="grid gap-3">
                  <ReviewCard
                    title="Inspection L1"
                    status={issue.levelOneStatus}
                    note={issue.levelOneNote}
                    editable={canEditL1}
                    helperText="L1 records acceptance or rejection with comments and signature timestamp."
                    signedBy={issue.levelOneSignedById}
                    signedAt={issue.levelOneSignedAt}
                    onSave={({ status, note }) =>
                      updateIssueFields({
                        levelOneStatus: status,
                        levelOneNote: note,
                      })
                    }
                  />
                  <ReviewCard
                    title="Inspection L2"
                    status={issue.levelTwoStatus}
                    note={issue.levelTwoNote}
                    editable={canEditL2}
                    helperText="L2 provides the final approval decision and closing comment."
                    signedBy={issue.levelTwoSignedById}
                    signedAt={issue.levelTwoSignedAt}
                    onSave={({ status, note }) =>
                      updateIssueFields({
                        levelTwoStatus: status,
                        levelTwoNote: note,
                      })
                    }
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

const SummaryRow: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-slate-800">{value}</div>
    </div>
  );
};

const ReviewCard: React.FC<{
  title: string;
  status: WorkflowReviewStatus;
  note: string | null;
  editable: boolean;
  helperText: string;
  signedBy?: string | null;
  signedAt?: Date | null;
  onSave: (payload: { status: WorkflowReviewStatus; note: string | null }) => void;
}> = ({ title, status, note, editable, helperText, signedBy, signedAt, onSave }) => {
  const [draftStatus, setDraftStatus] = useState(status);
  const [draftNote, setDraftNote] = useState(note ?? "");

  useEffect(() => {
    setDraftStatus(status);
    setDraftNote(note ?? "");
  }, [status, note]);

  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-800">{title}</div>
          <div className="mt-1 text-xs text-slate-500">{helperText}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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

      <div className="mt-4 grid gap-3">
        <select
          value={draftStatus}
          disabled={!editable}
          onChange={(e) => setDraftStatus(e.currentTarget.value as WorkflowReviewStatus)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        >
          {REVIEW_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <textarea
          value={draftNote}
          disabled={!editable}
          onChange={(e) => setDraftNote(e.currentTarget.value)}
          rows={3}
          placeholder="Add inspection notes"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        />
        <div className="text-xs text-slate-500">
          {signedAt
            ? `Signed by ${signedBy ?? "user"} on ${dateToLongString(signedAt)}`
            : "No signature captured yet."}
        </div>
        <div className="flex justify-end">
          <Button
            customColors
            disabled={!editable}
            onClick={() => onSave({ status: draftStatus, note: draftNote || null })}
            className="bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:bg-slate-300"
          >
            Save {title}
          </Button>
        </div>
      </div>
    </div>
  );
};

export { IssueDetailsInfoAccordion };