import { Suspense } from "react";

import { ReviewQueue } from "@/features/reviews/components/review-queue";
import { DEMO_WORKSPACE_ROOT } from "@/server/lib/repo-paths";

export default function ReviewsPage() {
  const defaultWorkspaceRoot = DEMO_WORKSPACE_ROOT;

  return (
    <Suspense
      fallback={
        <div className="rounded-[24px] border border-border/70 bg-card/80 p-8 text-sm text-muted-foreground">
          Loading review queue...
        </div>
      }
    >
      <ReviewQueue defaultWorkspaceRoot={defaultWorkspaceRoot} />
    </Suspense>
  );
}
