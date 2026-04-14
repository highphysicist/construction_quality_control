import { type GetIssuesResponse } from "@/app/api/issues/route";

export type IssueCountType = {
  TODO: number;
  IN_PROGRESS: number;
  INSPECTION: number;
  INSPECTION_L2: number;
  DONE: number;
};

export type MenuOptionType = {
  label: string;
  id: string;
};

export type IssueType = GetIssuesResponse["issues"][number];
