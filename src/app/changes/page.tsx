import { EvidenceChangeView } from "@/features/changes/components/evidence-change-view";
import { getEvidenceChangeOverview } from "@/server/services/evidence-change-service";

export const dynamic = "force-dynamic";

type ChangesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ChangesPage({ searchParams }: ChangesPageProps) {
  const routeParams = searchParams ? await searchParams : {};
  const topicId = readParam(routeParams.topic);
  const changeId = readParam(routeParams.change);
  const title = readParam(routeParams.title);
  const overview = await getEvidenceChangeOverview({
    focusTopicId: topicId ?? null,
    focusChangeId: changeId ?? null,
    focusChangeTitle: title ?? null,
  });

  return <EvidenceChangeView overview={overview} />;
}
