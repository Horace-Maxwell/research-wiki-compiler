import { Suspense } from "react";

import { SourceBrowser } from "@/features/sources/components/source-browser";
import { DEMO_WORKSPACE_ROOT } from "@/server/lib/repo-paths";

export default function SourcesPage() {
  const defaultWorkspaceRoot = DEMO_WORKSPACE_ROOT;

  return (
    <Suspense
      fallback={
        <div className="rounded-[24px] border border-border/70 bg-card/80 p-8 text-sm text-muted-foreground">
          Loading sources browser...
        </div>
      }
    >
      <SourceBrowser defaultWorkspaceRoot={defaultWorkspaceRoot} />
    </Suspense>
  );
}
