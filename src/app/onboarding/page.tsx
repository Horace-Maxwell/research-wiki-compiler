import { PageHeader } from "@/components/page-header";
import { WorkspaceSetupPanel } from "@/features/workspace/components/workspace-setup-panel";
import { DEMO_WORKSPACE_ROOT } from "@/server/lib/repo-paths";

export default function OnboardingPage() {
  const defaultWorkspaceRoot = DEMO_WORKSPACE_ROOT;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace onboarding"
        title="Initialize a real local workspace"
        description="Create the file-backed workspace tree, visible prompts, settings file, and SQLite metadata store that the rest of the compiled wiki workflow builds on."
        badge="Workspace setup"
      />
      <WorkspaceSetupPanel defaultWorkspaceRoot={defaultWorkspaceRoot} />
    </div>
  );
}
