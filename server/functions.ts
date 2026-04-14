import { filterUserForClient, generateIssuesForClient } from "@/utils/helpers";
import { type UserResource } from "@clerk/types";
import { clerkClient } from "@clerk/nextjs";
import {
  DEMO_PROJECT_ID,
  DEMO_PROJECT_KEY,
  defaultUsers,
  generateInitialUserComments,
  generateInitialUserIssues,
  generateInitialUserSprints,
  isLegacyDemoIssue,
  LEGACY_DEMO_USER_IDS,
} from "../prisma/seed-data";
import { prisma } from "./db";
import { SprintStatus } from "@prisma/client";

export async function ensureAuthenticatedAdminUser(
  userId: string | null | undefined
) {
  if (!userId) return null;

  await ensureProjectExists();

  const existingUser = await prisma.defaultUser.findUnique({
    where: { id: userId },
  });

  if (existingUser?.role === "ADMIN") {
    await prisma.member.upsert({
      where: { id: userId },
      update: { projectId: DEMO_PROJECT_ID },
      create: { id: userId, projectId: DEMO_PROJECT_ID },
    });
    return existingUser;
  }

  let clientUser = existingUser;
  if (!clientUser) {
    try {
      const clerkUser = await clerkClient.users.getUser(userId);
      clientUser = filterUserForClient(clerkUser);
    } catch {
      clientUser = {
        id: userId,
        name: "Admin",
        email: `${userId}@construction-qc.local`,
        avatar: null,
        role: "ADMIN",
      };
    }
  }

  const syncedUser = await prisma.defaultUser.upsert({
    where: { id: userId },
    update: {
      name: clientUser.name.trim() || clientUser.email,
      email: clientUser.email,
      avatar: clientUser.avatar,
      role: "ADMIN",
    },
    create: {
      id: userId,
      name: clientUser.name.trim() || clientUser.email,
      email: clientUser.email,
      avatar: clientUser.avatar,
      role: "ADMIN",
    },
  });

  await prisma.member.upsert({
    where: { id: userId },
    update: { projectId: DEMO_PROJECT_ID },
    create: { id: userId, projectId: DEMO_PROJECT_ID },
  });

  return syncedUser;
}

async function ensureProjectExists() {
  const existingProject = await prisma.project.findUnique({
    where: { id: DEMO_PROJECT_ID },
  });

  if (existingProject) {
    if (existingProject.name !== "Construction Quality Control") {
      await prisma.project.update({
        where: { id: DEMO_PROJECT_ID },
        data: {
          name: "Construction Quality Control",
          key: DEMO_PROJECT_KEY,
        },
      });
    }
    await initDefaultUsers();
    await initDefaultProjectMembers();
    return existingProject;
  }

  await initProject();
  await initDefaultUsers();
  await initDefaultProjectMembers();

  return prisma.project.findUnique({
    where: { id: DEMO_PROJECT_ID },
  });
}

async function ensureUserWorkspace(userId: string) {
  const existingSprints = await prisma.sprint.findMany({
    where: { creatorId: userId },
  });
  const existingIssues = await prisma.issue.findMany({
    where: { creatorId: userId, isDeleted: false },
  });

  const hasLegacyWorkspace = existingIssues.some((issue) =>
    isLegacyDemoIssue(issue.name) || issue.type === "BUG" || issue.type === "STORY"
  );

  if (hasLegacyWorkspace) {
    const issueIds = existingIssues.map((issue) => issue.id);
    await prisma.comment.deleteMany({
      where: {
        issueId: {
          in: issueIds,
        },
      },
    });
    await prisma.issue.deleteMany({
      where: {
        creatorId: userId,
      },
    });
    await prisma.sprint.deleteMany({
      where: {
        creatorId: userId,
      },
    });
  }

  if (!hasLegacyWorkspace && (existingSprints.length > 0 || existingIssues.length > 0)) {
    return;
  }

  await initDefaultSprints(userId);
  await initDefaultIssues(userId);
  await initDefaultIssueComments(userId);
}

export async function getInitialIssuesFromServer(
  userId: UserResource["id"] | undefined | null
) {
  await ensureProjectExists();

  if (userId) {
    await ensureAuthenticatedAdminUser(userId);
    await ensureUserWorkspace(userId);
  }

  let activeIssues = await prisma.issue.findMany({
    where: { isDeleted: false, creatorId: userId ?? "init" },
  });

  if (!activeIssues || activeIssues.length === 0) {
    return [];
  }

  const activeSprints = await prisma.sprint.findMany({
    where: {
      status: "ACTIVE",
    },
  });

  const userIds = activeIssues
    .flatMap((issue) => [issue.assigneeId, issue.reporterId] as string[])
    .filter(Boolean);

  const dbUsers = await prisma.defaultUser.findMany({
    where: {
      id: {
        in: userIds,
      },
    },
  });

  let clerkUsers: Awaited<ReturnType<typeof clerkClient.users.getUserList>> = [];
  if (userIds.length > 0) {
    try {
      clerkUsers = await clerkClient.users.getUserList({
        userId: userIds,
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

  const issues = generateIssuesForClient(
    activeIssues,
    users,
    activeSprints.map((sprint) => sprint.id)
  );
  return issues;
}

export async function getInitialProjectFromServer() {
  return ensureProjectExists();
}

export async function getInitialSprintsFromServer(
  userId: UserResource["id"] | undefined
) {
  await ensureProjectExists();

  if (userId) {
    await ensureAuthenticatedAdminUser(userId);
    await ensureUserWorkspace(userId);
  }

  let sprints = await prisma.sprint.findMany({
    where: {
      OR: [{ status: SprintStatus.ACTIVE }, { status: SprintStatus.PENDING }],
      creatorId: userId ?? "init",
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return sprints;
}

export async function initProject() {
  await prisma.project.upsert({
    where: {
      id: DEMO_PROJECT_ID,
    },
    update: {
      name: "Construction Quality Control",
      key: DEMO_PROJECT_KEY,
    },
    create: {
      id: DEMO_PROJECT_ID,
      name: "Construction Quality Control",
      key: DEMO_PROJECT_KEY,
    },
  });
}
export async function initDefaultUsers() {
  await prisma.defaultUser.deleteMany({
    where: {
      id: {
        in: [...LEGACY_DEMO_USER_IDS],
      },
    },
  });
  await Promise.all(
    defaultUsers.map(
      async (user) =>
        await prisma.defaultUser.upsert({
          where: {
            id: user.id,
          },
          update: {
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
          },
          create: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            role: user.role,
          },
        })
    )
  );
}
export async function initDefaultProjectMembers() {
  await prisma.member.deleteMany({
    where: {
      id: {
        in: [...LEGACY_DEMO_USER_IDS],
      },
    },
  });
  await Promise.all(
    defaultUsers.map(
      async (user) =>
        await prisma.member.upsert({
          where: {
            id: user.id,
          },
          update: {
            projectId: DEMO_PROJECT_ID,
          },
          create: {
            id: user.id,
            projectId: DEMO_PROJECT_ID,
          },
        })
    )
  );
}

export async function initDefaultIssues(userId: string) {
  const initialIssues = generateInitialUserIssues(userId);
  await Promise.all(
    initialIssues.map(
      async (issue) =>
        await prisma.issue.upsert({
          where: {
            id: issue.id,
          },
          update: {},
          create: {
            ...issue,
          },
        })
    )
  );
}

export async function initDefaultIssueComments(userId: string) {
  const initialComments = generateInitialUserComments(userId);
  await Promise.all(
    initialComments.map(
      async (comment) =>
        await prisma.comment.upsert({
          where: {
            id: comment.id,
          },
          update: {},
          create: {
            ...comment,
          },
        })
    )
  );
}

export async function initDefaultSprints(userId: string) {
  const initialSprints = generateInitialUserSprints(userId);
  await Promise.all(
    initialSprints.map(
      async (sprint) =>
        await prisma.sprint.upsert({
          where: {
            id: sprint.id,
          },
          update: {},
          create: {
            ...sprint,
          },
        })
    )
  );
}
