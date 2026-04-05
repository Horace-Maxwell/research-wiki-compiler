import { Suspense } from "react";

import { AuditBrowser } from "@/features/audits/components/audit-browser";
import { DEMO_WORKSPACE_ROOT } from "@/server/lib/repo-paths";

export default function AuditsPage() {
  const defaultWorkspaceRoot = DEMO_WORKSPACE_ROOT;

  return (
    <Suspense
      fallback={
        <div className="rounded-[24px] border border-border/70 bg-card/80 p-8 text-sm text-muted-foreground">
          Loading audits browser...
        </div>
      }
    >
      <AuditBrowser defaultWorkspaceRoot={defaultWorkspaceRoot} />
    </Suspense>
  );
}
