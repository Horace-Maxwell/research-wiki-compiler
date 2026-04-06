import { ResearchSessionView } from "@/features/sessions/components/research-session-view";
import { getResearchSessionOverview } from "@/server/services/research-session-service";

export const dynamic = "force-dynamic";

type SessionsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SessionsPage({ searchParams }: SessionsPageProps) {
  const routeParams = searchParams ? await searchParams : {};
  const topicId = readParam(routeParams.topic);
  const questionId = readParam(routeParams.question);
  const overview = await getResearchSessionOverview({
    focusTopicId: topicId ?? null,
    focusQuestionId: questionId ?? null,
  });

  return <ResearchSessionView overview={overview} />;
}
