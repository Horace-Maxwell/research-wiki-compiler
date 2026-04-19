import { ResearchSessionView } from "@/features/sessions/components/research-session-view";
import { readRequestLocale } from "@/lib/app-locale-server";
import { getResearchSessionOverview } from "@/server/services/research-session-service";

export const dynamic = "force-dynamic";

type SessionsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SessionsPage({ searchParams }: SessionsPageProps) {
  const locale = await readRequestLocale();
  const routeParams = searchParams ? await searchParams : {};
  const topicId = readParam(routeParams.topic);
  const questionId = readParam(routeParams.question);
  const overview = await getResearchSessionOverview({
    focusTopicId: topicId ?? null,
    focusQuestionId: questionId ?? null,
  });

  return <ResearchSessionView locale={locale} overview={overview} />;
}
