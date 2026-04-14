import { type Metadata } from "next";
import { getQueryClient } from "@/utils/get-query-client";
import { Hydrate } from "@/utils/hydrate";
import { dehydrate } from "@tanstack/query-core";
import { Roadmap } from "@/components/roadmap";
import {
  getInitialIssuesFromServer,
  getInitialProjectFromServer,
  getInitialSprintsFromServer,
} from "@/server/functions";
import { currentUser } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Roadmap",
};

const RoadmapPage = async () => {
  const user = await currentUser();
  const queryClient = getQueryClient();

  const results = await Promise.allSettled([
    queryClient.prefetchQuery(["issues"], () => getInitialIssuesFromServer(user?.id)),
    queryClient.prefetchQuery(["sprints"], () => getInitialSprintsFromServer(user?.id)),
    queryClient.prefetchQuery(["project"], getInitialProjectFromServer),
  ]);

  if (results[0].status === "rejected") {
    console.error("[project/roadmap] Failed to prefetch issues", results[0].reason);
    queryClient.setQueryData(["issues"], []);
  }

  if (results[1].status === "rejected") {
    console.error("[project/roadmap] Failed to prefetch sprints", results[1].reason);
    queryClient.setQueryData(["sprints"], []);
  }

  if (results[2].status === "rejected") {
    console.error("[project/roadmap] Failed to prefetch project", results[2].reason);
    queryClient.setQueryData(["project"], null);
  }

  const dehydratedState = dehydrate(queryClient);

  return (
    <Hydrate state={dehydratedState}>
      <Roadmap />
    </Hydrate>
  );
};

export default RoadmapPage;
