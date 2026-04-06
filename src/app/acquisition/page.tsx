import { AcquisitionTaskView } from "@/features/acquisition/components/acquisition-task-view";
import { getAcquisitionTaskOverview } from "@/server/services/acquisition-task-service";

export const dynamic = "force-dynamic";

type AcquisitionPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AcquisitionPage({ searchParams }: AcquisitionPageProps) {
  const routeParams = searchParams ? await searchParams : {};
  const topicId = readParam(routeParams.topic);
  const taskId = readParam(routeParams.task);
  const title = readParam(routeParams.title);
  const overview = await getAcquisitionTaskOverview({
    focusTopicId: topicId ?? null,
    focusTaskId: taskId ?? null,
    focusTaskTitle: title ?? null,
  });

  return <AcquisitionTaskView overview={overview} />;
}
