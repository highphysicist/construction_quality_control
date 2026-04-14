/* eslint-disable */

import { PrismaClient } from "@prisma/client";
import {
  DEMO_PROJECT_ID,
  DEMO_PROJECT_KEY,
  defaultUsers,
  generateInitialUserComments,
  generateInitialUserIssues,
  generateInitialUserSprints,
} from "./seed-data";
const prisma = new PrismaClient();

async function initProject() {
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
async function initDefaultUsers() {
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
async function initDefaultProjectMembers() {
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

async function initDefaultIssues(userId: string) {
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

async function initDefaultIssueComments(userId: string) {
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

async function initDefaultSprints(userId: string) {
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

async function main() {
  // Create default project
  await initProject();
  // Create default users
  await initDefaultUsers();
  // Create default project members
  await initDefaultProjectMembers();
  // Create default issues
  await initDefaultIssues("init");
  // Create comments for default issues
  await initDefaultIssueComments("init");
  // Create default sprints
  await initDefaultSprints("init");
}
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
