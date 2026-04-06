import { MonitoringView } from "@/features/monitoring/components/monitoring-view";
import { getMonitoringOverview } from "@/server/services/monitoring-service";

export const dynamic = "force-dynamic";

type MonitoringPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MonitoringPage({ searchParams }: MonitoringPageProps) {
  const routeParams = searchParams ? await searchParams : {};
  const topicId = readParam(routeParams.topic);
  const monitorId = readParam(routeParams.monitor);
  const title = readParam(routeParams.title);
  const overview = await getMonitoringOverview({
    focusTopicId: topicId ?? null,
    focusMonitorId: monitorId ?? null,
    focusMonitorTitle: title ?? null,
  });

  return <MonitoringView overview={overview} />;
}
