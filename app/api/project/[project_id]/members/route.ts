import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
// import { clerkClient } from "@clerk/nextjs/server";
// import { filterUserForClient } from "@/utils/helpers";
import { type DefaultUser } from "@prisma/client";
import { clerkClient } from "@clerk/nextjs";
import { filterUserForClient } from "@/utils/helpers";
import { getAuth } from "@clerk/nextjs/server";
import { ensureAuthenticatedAdminUser } from "@/server/functions";

export const dynamic = "force-dynamic";

export type GetProjectMembersResponse = {
  members: DefaultUser[];
};

type MembersParams = {
  params: {
    project_id: string;
  };
};

export async function GET(req: NextRequest, { params }: MembersParams) {
  const { userId } = getAuth(req);
  if (userId) {
    await ensureAuthenticatedAdminUser(userId);
  }
  const { project_id } = params;
  const members = await prisma.member.findMany({
    where: {
      projectId: project_id,
    },
  });

  const memberIds = members.map((member) => member.id);

  const dbUsers = await prisma.defaultUser.findMany({
    where: {
      id: {
        in: memberIds,
      },
    },
  });

  let clerkUsers: Awaited<ReturnType<typeof clerkClient.users.getUserList>> = [];
  if (memberIds.length > 0) {
    try {
      clerkUsers = await clerkClient.users.getUserList({
        userId: memberIds,
        limit: 20,
      });
    } catch {
      clerkUsers = [];
    }
  }

  const users = [
    ...dbUsers,
    ...clerkUsers.map(filterUserForClient).filter((clerkUser) => {
      return !dbUsers.some((dbUser) => dbUser.id === clerkUser.id);
    }),
  ];

  // return NextResponse.json<GetProjectMembersResponse>({ members:users });
  return NextResponse.json({ members: users });
}
