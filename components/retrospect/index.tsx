"use client";

import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { useRetrospect } from "@/hooks/query-hooks/use-retrospect";

const Retrospect: React.FC = () => {
  const [query, setQuery] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"ALL" | "TASK" | "SUBTASK">("ALL");

  const params = useMemo(
    () => ({
      q: query,
      regex: useRegex,
      type: typeFilter,
      limit: 250,
    }),
    [query, useRegex, typeFilter]
  );

  const { items, total, isLoading, isError } = useRetrospect(params);

  return (
    <div className="h-full overflow-y-auto bg-slate-100 px-6 py-6">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Retrospect</h1>
          <p className="mt-2 text-sm text-slate-600">
            Search completed tests and test instances for audit review. Supports keyword and regex mode.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-[2fr_1fr_auto]">
            <input
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              placeholder='Search by project, epic, test, instance, users, or regex (example: "done|instance")'
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.currentTarget.value as "ALL" | "TASK" | "SUBTASK")
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="ALL">All (Tests + Instances)</option>
              <option value="TASK">Tests Only</option>
              <option value="SUBTASK">Test Instances Only</option>
            </select>

            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={useRegex}
                onChange={(e) => setUseRegex(e.currentTarget.checked)}
              />
              Regex
            </label>
          </div>
        </div>

        <div className="mb-3 text-sm text-slate-600">
          {isLoading ? "Loading completed records..." : `Showing ${items.length} of ${total} completed records`}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <HeaderCell>Timestamp</HeaderCell>
                <HeaderCell>Project</HeaderCell>
                <HeaderCell>Epic</HeaderCell>
                <HeaderCell>Test</HeaderCell>
                <HeaderCell>Test Instance</HeaderCell>
                <HeaderCell>Status</HeaderCell>
                <HeaderCell>Assignee</HeaderCell>
                <HeaderCell>Reporter</HeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isError ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-red-600">
                    Failed to load retrospective records. Please adjust the query and retry.
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">
                    No completed records matched your filters.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <DataCell>{dayjs(item.timestamp).format("YYYY-MM-DD HH:mm")}</DataCell>
                    <DataCell>{item.project.key}</DataCell>
                    <DataCell>{item.epic?.key ?? "-"}</DataCell>
                    <DataCell>{item.test?.key ?? "-"}</DataCell>
                    <DataCell>{item.testInstance?.key ?? "-"}</DataCell>
                    <DataCell>
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                        {item.status}
                      </span>
                    </DataCell>
                    <DataCell>{item.assignee?.name ?? "Unassigned"}</DataCell>
                    <DataCell>{item.reporter?.name ?? "-"}</DataCell>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const HeaderCell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
    {children}
  </th>
);

const DataCell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{children}</td>
);

export { Retrospect };
