import { ResearchSynthesisView } from "@/features/syntheses/components/research-synthesis-view";
import { readRequestLocale } from "@/lib/app-locale-server";
import { getResearchSynthesisOverview } from "@/server/services/research-synthesis-service";

export const dynamic = "force-dynamic";

type SynthesesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SynthesesPage({ searchParams }: SynthesesPageProps) {
  const locale = await readRequestLocale();
  const routeParams = searchParams ? await searchParams : {};
  const topicId = readParam(routeParams.topic);
  const synthesisId = readParam(routeParams.synthesis);
  const title = readParam(routeParams.title);
  const overview = await getResearchSynthesisOverview({
    focusTopicId: topicId ?? null,
    focusSynthesisId: synthesisId ?? null,
    focusSynthesisTitle: title ?? null,
  });

  return <ResearchSynthesisView locale={locale} overview={overview} />;
}
