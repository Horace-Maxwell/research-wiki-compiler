import { Suspense } from "react";

import { SettingsEditor } from "@/features/settings/components/settings-editor";
import { DEMO_WORKSPACE_ROOT } from "@/server/lib/repo-paths";

export default function SettingsPage() {
  const defaultWorkspaceRoot = DEMO_WORKSPACE_ROOT;

  return (
    <Suspense
      fallback={
        <div className="rounded-[24px] border border-border/70 bg-card/80 p-8 text-sm text-muted-foreground">
          Loading settings...
        </div>
      }
    >
      <SettingsEditor defaultWorkspaceRoot={defaultWorkspaceRoot} />
    </Suspense>
  );
}
