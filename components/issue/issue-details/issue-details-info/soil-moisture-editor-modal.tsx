import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalOverlay,
  ModalPortal,
  ModalTitle,
  ModalTrigger,
} from "@/components/ui/modal";
import { type IssueType } from "@/utils/types";
import { type WorkflowReviewStatus } from "@prisma/client";
import { FiEdit3 } from "react-icons/fi";
import { MdClose } from "react-icons/md";
import { type PatchIssueBody } from "@/app/api/issues/[issueId]/route";
import { useCurrentWorkflowActor } from "@/hooks/use-current-workflow-actor";
import {
  canEditLevelOneFields,
  canEditLevelTwoFields,
  canEditTesterFields,
} from "@/utils/workflow";
import { dateToLongString } from "@/utils/helpers";

const REVIEW_OPTIONS: WorkflowReviewStatus[] = ["PENDING", "OK", "NOT_OK"];

type SoilMoistureEditorModalProps = {
  issue: IssueType;
  onUpdate: (payload: Omit<PatchIssueBody, "issueId">) => void;
  triggerClassName?: string;
  triggerLabel?: string;
};

const SoilMoistureEditorModal: React.FC<SoilMoistureEditorModalProps> = ({
  issue,
  onUpdate,
  triggerClassName,
  triggerLabel,
}) => {
  const actor = useCurrentWorkflowActor();
  const canEditTester = canEditTesterFields(actor, issue);
  const canEditL1 = canEditLevelOneFields(actor, issue);
  const canEditL2 = canEditLevelTwoFields(actor, issue);

  return (
    <Modal>
      <ModalTrigger asChild>
        <Button
          customColors
          className={
            triggerClassName ??
            "flex items-center gap-x-2 bg-blue-600 text-white hover:bg-blue-700"
          }
        >
          <FiEdit3 className="text-sm" />
          <span>{triggerLabel ?? "Edit Soil Moisture Slip"}</span>
        </Button>
      </ModalTrigger>
      <ModalPortal>
        <ModalOverlay />
        <ModalContent className="top-[8vh] h-fit max-h-[84vh] w-[min(860px,92vw)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-0 shadow-2xl">
          <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur">
            <div>
              <div className="mb-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Soil Moisture Slip
              </div>
              <ModalTitle className="text-xl font-semibold text-slate-900">
                {issue.name}
              </ModalTitle>
              <ModalDescription className="mt-1 text-sm text-slate-500">
                Update the sample, weights, and inspection outcomes for this test instance.
              </ModalDescription>
            </div>
            <ModalClose asChild>
              <Button customColors className="bg-transparent text-slate-500 hover:bg-slate-100">
                <MdClose className="text-xl" />
              </Button>
            </ModalClose>
          </div>

          <div className="grid gap-6 px-6 py-6 md:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <h3 className="text-sm font-semibold text-slate-800">Sample Inputs</h3>
                <div className="mt-4 grid gap-4">
                  <Field label="Sample ID">
                    <input
                      value={issue.sampleLabel ?? ""}
                      disabled={!canEditTester}
                      onChange={(e) =>
                        onUpdate({
                          sampleLabel: e.currentTarget.value || null,
                        })
                      }
                      placeholder="Sample A"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </Field>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Initial Weight (g)">
                      <input
                        type="number"
                        step="0.001"
                        value={issue.initialWeight ?? ""}
                        disabled={!canEditTester}
                        onChange={(e) =>
                          onUpdate({
                            initialWeight:
                              e.currentTarget.value === ""
                                ? null
                                : Number(e.currentTarget.value),
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </Field>

                    <Field label="Final Weight (g)">
                      <input
                        type="number"
                        step="0.001"
                        value={issue.finalWeight ?? ""}
                        disabled={!canEditTester}
                        onChange={(e) =>
                          onUpdate({
                            finalWeight:
                              e.currentTarget.value === ""
                                ? null
                                : Number(e.currentTarget.value),
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </Field>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-800">Inspection Notes</h3>
                <div className="mt-4 space-y-4">
                  <ReviewSection
                    title="Inspection L1"
                    status={issue.levelOneStatus}
                    note={issue.levelOneNote}
                    editable={canEditL1}
                    signedBy={issue.levelOneSignedById}
                    signedAt={issue.levelOneSignedAt}
                    onStatusChange={(status) =>
                      onUpdate({ levelOneStatus: status })
                    }
                    onNoteChange={(note) =>
                      onUpdate({ levelOneNote: note })
                    }
                  />
                  <ReviewSection
                    title="Inspection L2"
                    status={issue.levelTwoStatus}
                    note={issue.levelTwoNote}
                    editable={canEditL2}
                    signedBy={issue.levelTwoSignedById}
                    signedAt={issue.levelTwoSignedAt}
                    onStatusChange={(status) =>
                      onUpdate({ levelTwoStatus: status })
                    }
                    onNoteChange={(note) =>
                      onUpdate({ levelTwoNote: note })
                    }
                  />
                </div>
              </section>
            </div>

            <div className="space-y-4">
              <section className="rounded-xl bg-slate-900 p-5 text-white shadow-lg">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-300">
                  Computed Result
                </div>
                <div className="mt-5 grid gap-3">
                  <MetricCard
                    label="Moisture Loss"
                    value={
                      issue.moistureWeight == null
                        ? "-"
                        : `${issue.moistureWeight.toFixed(3)} g`
                    }
                  />
                  <MetricCard
                    label="Moisture %"
                    value={
                      issue.moisturePct == null
                        ? "-"
                        : `${issue.moisturePct.toFixed(3)}%`
                    }
                  />
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-800">Context</h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <MetaRow label="Parent Test" value={issue.parent?.name ?? "-"} />
                  <MetaRow label="Assignee" value={issue.assignee?.name ?? "Unassigned"} />
                  <MetaRow label="Status" value={issue.status.replaceAll("_", " ")} />
                  <MetaRow label="Workflow" value="Soil Moisture" />
                  <MetaRow
                    label="Slip Recorded"
                    value={
                      issue.testerRecordedAt
                        ? dateToLongString(issue.testerRecordedAt)
                        : "Not recorded"
                    }
                  />
                </dl>
              </section>
            </div>
          </div>
        </ModalContent>
      </ModalPortal>
    </Modal>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
};

const ReviewSection: React.FC<{
  title: string;
  status: WorkflowReviewStatus;
  note: string | null;
  editable: boolean;
  signedBy: string | null;
  signedAt: Date | null;
  onStatusChange: (status: WorkflowReviewStatus) => void;
  onNoteChange: (note: string | null) => void;
}> = ({
  title,
  status,
  note,
  editable,
  signedBy,
  signedAt,
  onStatusChange,
  onNoteChange,
}) => {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="mb-3 text-sm font-semibold text-slate-800">{title}</div>
      <div className="grid gap-3">
        <select
          value={status}
          disabled={!editable}
          onChange={(e) => onStatusChange(e.currentTarget.value as WorkflowReviewStatus)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        >
          {REVIEW_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <textarea
          value={note ?? ""}
          disabled={!editable}
          onChange={(e) => onNoteChange(e.currentTarget.value || null)}
          rows={3}
          placeholder="Add inspection notes"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        />
        <div className="text-xs text-slate-500">
          {signedAt
            ? `Signed by ${signedBy ?? "user"} on ${dateToLongString(signedAt)}`
            : "No signature captured yet."}
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => {
  return (
    <div className="rounded-xl bg-white/8 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.14em] text-slate-300">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
};

const MetaRow: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  return (
    <div className="flex items-start justify-between gap-x-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
};

export { SoilMoistureEditorModal };
