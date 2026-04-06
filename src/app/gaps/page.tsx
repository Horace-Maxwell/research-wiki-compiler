import { EvidenceGapView } from "@/features/gaps/components/evidence-gap-view";
import { getEvidenceGapOverview } from "@/server/services/evidence-gap-service";

export const dynamic = "force-dynamic";

type GapsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function GapsPage({ searchParams }: GapsPageProps) {
  const routeParams = searchParams ? await searchParams : {};
  const topicId = readParam(routeParams.topic);
  const gapId = readParam(routeParams.gap);
  const title = readParam(routeParams.title);
  const overview = await getEvidenceGapOverview({
    focusTopicId: topicId ?? null,
    focusGapId: gapId ?? null,
    focusGapTitle: title ?? null,
  });

  return <EvidenceGapView overview={overview} />;
}
