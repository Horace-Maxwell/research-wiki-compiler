import { Suspense } from "react";

import { AskWorkbench } from "@/features/ask/components/ask-workbench";
import { DEMO_WORKSPACE_ROOT } from "@/server/lib/repo-paths";

export default function AskPage() {
  const defaultWorkspaceRoot = DEMO_WORKSPACE_ROOT;

  return (
    <Suspense
      fallback={
        <div className="rounded-[24px] border border-border/70 bg-card/80 p-8 text-sm text-muted-foreground">
          Loading ask workspace...
        </div>
      }
    >
      <AskWorkbench defaultWorkspaceRoot={defaultWorkspaceRoot} />
    </Suspense>
  );
}
