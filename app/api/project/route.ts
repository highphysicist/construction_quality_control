import { type NextRequest, NextResponse } from "next/server";
import { type Project } from "@prisma/client";
import {
  ensureAuthenticatedAdminUser,
  getInitialProjectFromServer,
} from "@/server/functions";
import { getAuth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export type GetProjectResponse = {
  project: Project | null;
};

export async function GET(req: NextRequest) {
  const { userId } = getAuth(req);
  if (userId) {
    await ensureAuthenticatedAdminUser(userId);
  }

  const project = await getInitialProjectFromServer();

  // return NextResponse.json<GetProjectResponse>({ project });
  return NextResponse.json({ project });
}
