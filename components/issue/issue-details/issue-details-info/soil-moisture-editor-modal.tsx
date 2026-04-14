import { Button } from "@/components/ui/button";
import { toast } from "@/components/toast";
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
import { FiEdit3 } from "react-icons/fi";
import { MdClose } from "react-icons/md";
import { type PatchIssueBody } from "@/app/api/issues/[issueId]/route";
import { useCurrentWorkflowActor } from "@/hooks/use-current-workflow-actor";
import {
  canEditTesterFields,
} from "@/utils/workflow";
import { useEffect, useState } from "react";
import { dateToLongString } from "@/utils/helpers";

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
  const [open, setOpen] = useState(false);
  const [sampleLabel, setSampleLabel] = useState(issue.sampleLabel ?? "");
  const [initialWeight, setInitialWeight] = useState(
    issue.initialWeight == null ? "" : String(issue.initialWeight)
  );
  const [finalWeight, setFinalWeight] = useState(
    issue.finalWeight == null ? "" : String(issue.finalWeight)
  );
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const canEditTester = canEditTesterFields(actor, issue);

  useEffect(() => {
    if (!open) {
      setSampleLabel(issue.sampleLabel ?? "");
      setInitialWeight(issue.initialWeight == null ? "" : String(issue.initialWeight));
      setFinalWeight(issue.finalWeight == null ? "" : String(issue.finalWeight));
      setValidationMessage(null);
    }
  }, [issue.finalWeight, issue.initialWeight, issue.sampleLabel, open]);

  function handleSave() {
    const parsedInitial = initialWeight === "" ? null : Number(initialWeight);
    const parsedFinal = finalWeight === "" ? null : Number(finalWeight);

    if (
      (parsedInitial != null && Number.isNaN(parsedInitial)) ||
      (parsedFinal != null && Number.isNaN(parsedFinal))
    ) {
      setValidationMessage("Weights must be valid numbers.");
      return;
    }

    if ((parsedInitial == null) !== (parsedFinal == null)) {
      setValidationMessage("Enter both initial and final weights before saving the slip.");
      return;
    }

    if (
      parsedInitial != null &&
      parsedFinal != null &&
      parsedInitial <= parsedFinal
    ) {
      setValidationMessage("Initial weight must be greater than final weight.");
      return;
    }

    setValidationMessage(null);
    onUpdate({
      sampleLabel: sampleLabel.trim() || null,
      initialWeight: parsedInitial,
      finalWeight: parsedFinal,
    });
    toast.success({
      message: "Soil moisture slip saved",
      description: "Weights and sample details were updated.",
    });
    setOpen(false);
  }

  return (
    <Modal open={open} onOpenChange={setOpen}>
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
                Update the sample and weights for this test instance, then save to compute the result.
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
                      value={sampleLabel}
                      disabled={!canEditTester}
                      onChange={(e) => setSampleLabel(e.currentTarget.value)}
                      placeholder="Sample A"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </Field>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Initial Weight (g)">
                      <input
                        type="number"
                        step="0.001"
                        value={initialWeight}
                        disabled={!canEditTester}
                        onChange={(e) => setInitialWeight(e.currentTarget.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </Field>

                    <Field label="Final Weight (g)">
                      <input
                        type="number"
                        step="0.001"
                        value={finalWeight}
                        disabled={!canEditTester}
                        onChange={(e) => setFinalWeight(e.currentTarget.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </Field>
                  </div>
                </div>

                {validationMessage ? (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {validationMessage}
                  </div>
                ) : null}

                <div className="mt-4 flex items-center justify-end gap-2">
                  <ModalClose asChild>
                    <Button customColors className="bg-slate-100 text-slate-700 hover:bg-slate-200">
                      Cancel
                    </Button>
                  </ModalClose>
                  <Button
                    customColors
                    disabled={!canEditTester}
                    onClick={handleSave}
                    className="bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300"
                  >
                    Save Slip
                  </Button>
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
