import { Suspense } from "react";

import { SettingsEditor } from "@/features/settings/components/settings-editor";
import { getLocaleCopy } from "@/lib/app-locale";
import { readRequestLocale } from "@/lib/app-locale-server";
import { DEMO_WORKSPACE_ROOT } from "@/server/lib/repo-paths";

export default async function SettingsPage() {
  const locale = await readRequestLocale();
  const copy = getLocaleCopy(locale);
  const defaultWorkspaceRoot = DEMO_WORKSPACE_ROOT;

  return (
    <Suspense
      fallback={
        <div className="rounded-[24px] border border-border/70 bg-card/80 p-8 text-sm text-muted-foreground">
          {copy.settings.loading}
        </div>
      }
    >
      <SettingsEditor defaultWorkspaceRoot={defaultWorkspaceRoot} />
    </Suspense>
  );
}
