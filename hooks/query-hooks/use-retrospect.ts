"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/utils/api";
import { type RetrospectSearchParams } from "@/utils/api/retrospect";

export const useRetrospect = (params: RetrospectSearchParams) => {
  const stableParams = useMemo(
    () => ({
      q: params.q ?? "",
      regex: !!params.regex,
      assigneeId: params.assigneeId ?? "",
      reporterId: params.reporterId ?? "",
      type: params.type ?? "ALL",
      from: params.from ?? "",
      to: params.to ?? "",
      limit: params.limit ?? 150,
    }),
    [
      params.q,
      params.regex,
      params.assigneeId,
      params.reporterId,
      params.type,
      params.from,
      params.to,
      params.limit,
    ]
  );

  const query = useQuery(["retrospect", stableParams], () =>
    api.retrospect.search(stableParams)
  );

  return {
    items: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
  };
};
