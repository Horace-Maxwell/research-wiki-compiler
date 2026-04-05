import rehypeSanitize, { defaultSchema, type Options as RehypeSanitizeOptions } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { findAndReplace } from "mdast-util-find-and-replace";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import type { WikiPageSummary } from "@/lib/contracts/wiki";
import { resolveWikiLinkTarget } from "@/server/services/wiki-link-service";

function remarkResearchWikilinks({
  pages,
  workspaceRoot,
}: {
  pages: WikiPageSummary[];
  workspaceRoot: string;
}) {
  return (tree: Parameters<typeof findAndReplace>[0]) => {
    findAndReplace(
      tree,
      [
        /\[\[([^[\]|]+?)(?:\|([^[\]]+?))?\]\]/g,
        (match, target, alias) => {
          const resolved = resolveWikiLinkTarget(String(target), pages, workspaceRoot);

          if (!("targetPageId" in resolved)) {
            return match;
          }

          return {
            type: "link",
            url: resolved.href,
            title: resolved.targetTitle,
            children: [
              {
                type: "text",
                value: String(alias ?? target).trim(),
              },
            ],
          };
        },
      ],
      {
        ignore: ["link", "linkReference", "definition", "code", "inlineCode"],
      },
    );
  };
}

const sanitizeSchema: RehypeSanitizeOptions = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a ?? []), ["href"], ["title"]],
  },
};

export async function renderMarkdownToHtml(
  markdown: string,
  pages: WikiPageSummary[],
  workspaceRoot: string,
) {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkResearchWikilinks, {
      pages,
      workspaceRoot,
    })
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify)
    .process(markdown);

  return String(result);
}
