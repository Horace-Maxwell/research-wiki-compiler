import { QuestionWorkflowView } from "@/features/questions/components/question-workflow-view";
import { readRequestLocale } from "@/lib/app-locale-server";
import { getQuestionWorkflowOverview } from "@/server/services/question-workflow-service";

export const dynamic = "force-dynamic";

type QuestionsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function QuestionsPage({ searchParams }: QuestionsPageProps) {
  const locale = await readRequestLocale();
  const routeParams = searchParams ? await searchParams : {};
  const topicId = readParam(routeParams.topic);
  const overview = await getQuestionWorkflowOverview(topicId ?? null);

  return <QuestionWorkflowView locale={locale} overview={overview} />;
}
