import { WikiBrowser } from "@/features/wiki/components/wiki-browser";
import type { WikiPageDetail, WikiPageSummary } from "@/lib/contracts/wiki";
import { DEMO_WORKSPACE_ROOT } from "@/server/lib/repo-paths";
import { getWikiPageDetail, listWikiPages } from "@/server/services/wiki-page-service";

export const dynamic = "force-dynamic";

type WikiPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function WikiPage({ searchParams }: WikiPageProps) {
  const params = searchParams ? await searchParams : {};
  const requestedPageId = readParam(params.pageId);
  const defaultWorkspaceRoot = DEMO_WORKSPACE_ROOT;

  let initialPages: WikiPageSummary[] = [];
  let initialDetail: WikiPageDetail | null = null;

  try {
    initialPages = await listWikiPages(defaultWorkspaceRoot);

    const initialPage =
      initialPages.find((page) => page.id === requestedPageId) ?? initialPages[0] ?? null;

    initialDetail = initialPage
      ? await getWikiPageDetail(defaultWorkspaceRoot, initialPage.id)
      : null;
  } catch {
    initialPages = [];
    initialDetail = null;
  }

  return (
    <WikiBrowser
      defaultWorkspaceRoot={defaultWorkspaceRoot}
      initialDetail={initialDetail}
      initialPages={initialPages}
    />
  );
}
