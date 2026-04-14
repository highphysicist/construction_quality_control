"use client";

import { useUser } from "@clerk/clerk-react";
import { useProject } from "./query-hooks/use-project";

export const useCurrentWorkflowActor = () => {
  const { user } = useUser();
  const { members } = useProject();

  const member = members?.find((projectMember) => projectMember.id === user?.id) ?? null;

  return {
    userId: user?.id ?? null,
    role: member?.role ?? null,
    member,
  };
};