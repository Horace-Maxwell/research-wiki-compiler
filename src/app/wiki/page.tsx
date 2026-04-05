import { Suspense } from "react";

import { WikiBrowser } from "@/features/wiki/components/wiki-browser";
import { DEMO_WORKSPACE_ROOT } from "@/server/lib/repo-paths";

export default function WikiPage() {
  const defaultWorkspaceRoot = DEMO_WORKSPACE_ROOT;

  return (
    <Suspense
      fallback={
        <div className="rounded-[24px] border border-border/70 bg-card/80 p-8 text-sm text-muted-foreground">
          Loading wiki browser...
        </div>
      }
    >
      <WikiBrowser defaultWorkspaceRoot={defaultWorkspaceRoot} />
    </Suspense>
  );
}
