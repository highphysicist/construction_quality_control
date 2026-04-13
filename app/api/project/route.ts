import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { type Project } from "@prisma/client";
import { initProject } from "@/server/functions";

export const dynamic = "force-dynamic";

export type GetProjectResponse = {
  project: Project | null;
};

export async function GET() {
  let project = await prisma.project.findUnique({
    where: {
      key: "JIRA-CLONE",
    },
  });

  if (!project) {
    await initProject();
    project = await prisma.project.findUnique({
      where: {
        key: "JIRA-CLONE",
      },
    });
  }

  // return NextResponse.json<GetProjectResponse>({ project });
  return NextResponse.json({ project });
}
