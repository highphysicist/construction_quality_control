"use client";
import { toast } from "@/components/toast";
import { api } from "@/utils/api";
import { type IssueType } from "@/utils/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type AxiosError } from "axios";
import { TOO_MANY_REQUESTS } from ".";

const useUpdateIssue = () => {
  const queryClient = useQueryClient();

  const { mutate: updateIssue, isLoading: isUpdating } = useMutation(
    ["issues"],
    api.issues.patchIssue,
    {
      onMutate: async (newIssue) => {
        await queryClient.cancelQueries(["issues"]);

        const previousIssues = queryClient.getQueryData<IssueType[]>(["issues"]);

        queryClient.setQueryData(["issues"], (old?: IssueType[]) => {
          return (old ?? []).map((issue) => {
            if (issue.id === newIssue.issueId) {
              return {
                ...issue,
                ...newIssue,
              } as IssueType;
            }

            if (issue.parentId === newIssue.issueId) {
              return {
                ...issue,
                parent: issue.parent
                  ? ({
                      ...issue.parent,
                      ...newIssue,
                    } as IssueType["parent"])
                  : issue.parent,
              } as IssueType;
            }

            if (issue.id === newIssue.parentId) {
              return {
                ...issue,
                children: issue.children.map((child) =>
                  child.id === newIssue.issueId
                    ? ({
                        ...child,
                        ...newIssue,
                      } as IssueType)
                    : child
                ),
              } as IssueType;
            }

            return issue;
          });
        });

        return { previousIssues };
      },
      onError: (err: AxiosError, newIssue, context) => {
        queryClient.setQueryData(["issues"], context?.previousIssues);

        if (err?.response?.data == "Too many requests") {
          toast.error(TOO_MANY_REQUESTS);
          return;
        }

        toast.error({
          message: `Something went wrong while updating the issue ${newIssue.issueId}`,
          description:
            typeof err?.response?.data === "string"
              ? err.response.data
              : "Please try again later.",
        });
      },
      onSuccess: (updatedIssue) => {
        queryClient.setQueryData(["issues"], (old?: IssueType[]) => {
          return (old ?? []).map((issue) => {
            if (issue.id === updatedIssue.id) {
              return {
                ...issue,
                ...updatedIssue,
                assignee: updatedIssue.assignee ?? issue.assignee,
              } as IssueType;
            }

            if (issue.parentId === updatedIssue.id) {
              return {
                ...issue,
                parent: issue.parent
                  ? ({
                      ...issue.parent,
                      ...updatedIssue,
                    } as IssueType["parent"])
                  : issue.parent,
              } as IssueType;
            }

            if (issue.id === updatedIssue.parentId) {
              return {
                ...issue,
                children: issue.children.map((child) =>
                  child.id === updatedIssue.id
                    ? ({ ...child, ...updatedIssue } as IssueType)
                    : child
                ),
              } as IssueType;
            }

            return issue;
          });
        });
      },
      onSettled: () => {
        queryClient.invalidateQueries(["issues"]);
      },
    }
  );

  return { updateIssue, isUpdating };
};

export { useUpdateIssue };