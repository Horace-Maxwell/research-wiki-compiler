import { DashboardWorkbench } from "@/features/dashboard/components/dashboard-workbench";
import { DEMO_WORKSPACE_ROOT } from "@/server/lib/repo-paths";

export default function DashboardPage() {
  const defaultWorkspaceRoot = DEMO_WORKSPACE_ROOT;

  return <DashboardWorkbench defaultWorkspaceRoot={defaultWorkspaceRoot} />;
}
