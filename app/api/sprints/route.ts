import { prisma, ratelimit } from "@/server/db";
import { getAuth } from "@clerk/nextjs/server";
import { type Sprint } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import {
  ensureAuthenticatedAdminUser,
  getInitialSprintsFromServer,
} from "@/server/functions";

export const dynamic = "force-dynamic";

export type PostSprintResponse = {
  sprint: Sprint;
};

export type GetSprintsResponse = {
  sprints: Sprint[];
};

export async function POST(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) return new Response("Unauthenticated request", { status: 403 });
  const { success } = await ratelimit.limit(userId);
  if (!success) return new Response("Too many requests", { status: 429 });
  await ensureAuthenticatedAdminUser(userId);

  const sprints = await prisma.sprint.findMany({
    where: {
      creatorId: userId,
    },
  });

  const k = sprints.length + 1;

  const sprint = await prisma.sprint.create({
    data: {
      name: `SPRINT-${k}`,
      description: "",
      creatorId: userId,
    },
  });
  // return NextResponse.json<PostSprintResponse>({ sprint });
  return NextResponse.json({ sprint });
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    const sprints = await getInitialSprintsFromServer(userId ?? undefined);

    return NextResponse.json({ sprints });
  } catch (error) {
    console.error("[api/sprints][GET] Failed to load sprints", error);
    return NextResponse.json(
      {
        sprints: [],
        error: "Failed to load sprints",
      },
      { status: 500 }
    );
  }
}
