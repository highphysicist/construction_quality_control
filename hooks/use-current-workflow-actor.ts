"use client";

import { useUser } from "@clerk/clerk-react";
import { useProject } from "./query-hooks/use-project";
import { type UserRole } from "@prisma/client";

export const useCurrentWorkflowActor = () => {
  const { user } = useUser();
  const { members } = useProject();

  const member = members?.find((projectMember) => projectMember.id === user?.id) ?? null;
  const role: UserRole | null = user ? member?.role ?? "ADMIN" : null;

  return {
    userId: user?.id ?? null,
    role,
    member,
  };
};