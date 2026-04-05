import { DashboardWorkbench } from "@/features/dashboard/components/dashboard-workbench";
import type { DashboardOverview } from "@/lib/contracts/dashboard";
import { normalizeWorkspaceRoot } from "@/server/lib/path-safety";
import { DEMO_WORKSPACE_ROOT } from "@/server/lib/repo-paths";
import { getDashboardOverview } from "@/server/services/dashboard-service";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function resolveRequestedWorkspaceRoot(value: string | undefined) {
  if (!value) {
    return DEMO_WORKSPACE_ROOT;
  }

  try {
    return normalizeWorkspaceRoot(value);
  } catch {
    return DEMO_WORKSPACE_ROOT;
  }
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = searchParams ? await searchParams : {};
  const requestedWorkspaceRoot = readParam(params.workspaceRoot);
  const defaultWorkspaceRoot = resolveRequestedWorkspaceRoot(requestedWorkspaceRoot);
  let initialDashboard: DashboardOverview | null = null;

  try {
    initialDashboard = await getDashboardOverview(defaultWorkspaceRoot);
  } catch {
    initialDashboard = null;
  }

  return (
    <DashboardWorkbench
      defaultWorkspaceRoot={defaultWorkspaceRoot}
      initialDashboard={initialDashboard}
    />
  );
}
