import axios from "axios";
import { getBaseUrl } from "../helpers";
import { type GetRetrospectResponse } from "@/app/api/retrospect/route";

const baseUrl = getBaseUrl();

export type RetrospectSearchParams = {
  q?: string;
  regex?: boolean;
  assigneeId?: string;
  reporterId?: string;
  type?: "ALL" | "TASK" | "SUBTASK";
  from?: string;
  to?: string;
  limit?: number;
};

export const retrospectRoutes = {
  search: async (params: RetrospectSearchParams) => {
    const searchParams = new URLSearchParams();

    if (params.q) searchParams.set("q", params.q);
    if (params.regex) searchParams.set("regex", "true");
    if (params.assigneeId) searchParams.set("assigneeId", params.assigneeId);
    if (params.reporterId) searchParams.set("reporterId", params.reporterId);
    if (params.type && params.type !== "ALL") searchParams.set("type", params.type);
    if (params.from) searchParams.set("from", params.from);
    if (params.to) searchParams.set("to", params.to);
    if (params.limit) searchParams.set("limit", String(params.limit));

    const query = searchParams.toString();
    const suffix = query ? `?${query}` : "";

    const { data } = await axios.get<GetRetrospectResponse>(
      `${baseUrl}/api/retrospect${suffix}`
    );

    return data;
  },
};
