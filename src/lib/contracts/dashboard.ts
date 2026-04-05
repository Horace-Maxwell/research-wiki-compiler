import { z } from "zod";

import { activityLogEntrySchema } from "@/lib/contracts/log";

const intCountSchema = z.number().int().nonnegative();
const isoDateTimeSchema = z.string().datetime();

export const dashboardWikiPagePreviewSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(),
  path: z.string(),
  reviewStatus: z.string(),
  sourceRefCount: intCountSchema,
  pageRefCount: intCountSchema,
  updatedAt: isoDateTimeSchema,
  href: z.string(),
});

export const dashboardSourcePreviewSchema = z.object({
  id: z.string(),
  title: z.string(),
  sourceType: z.string(),
  status: z.string(),
  summaryStatus: z.string(),
  importedAt: isoDateTimeSchema.nullable(),
  updatedAt: isoDateTimeSchema,
  href: z.string(),
});

export const dashboardReviewPreviewSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  riskLevel: z.string(),
  proposalType: z.string(),
  targetPageTitle: z.string().nullable(),
  updatedAt: isoDateTimeSchema,
  href: z.string(),
});

export const dashboardAnswerPreviewSchema = z.object({
  id: z.string(),
  question: z.string(),
  archivedPageTitle: z.string().nullable(),
  archivedPagePath: z.string().nullable(),
  updatedAt: isoDateTimeSchema,
  href: z.string(),
});

export const dashboardAuditPreviewSchema = z.object({
  id: z.string(),
  mode: z.string(),
  status: z.string(),
  findingsCount: intCountSchema,
  highestSeverity: z.enum(["low", "medium", "high"]).nullable(),
  completedAt: isoDateTimeSchema.nullable(),
  href: z.string(),
});

export const dashboardOverviewSchema = z.object({
  workspaceRoot: z.string(),
  initialized: z.boolean(),
  workspaceName: z.string().nullable(),
  gitInitialized: z.boolean(),
  databaseInitialized: z.boolean(),
  counts: z
    .object({
      wikiPages: z.object({
        total: intCountSchema,
        byType: z.record(z.string(), intCountSchema),
      }),
      sources: z.object({
        total: intCountSchema,
        byStatus: z.record(z.string(), intCountSchema),
        bySummaryStatus: z.record(z.string(), intCountSchema),
      }),
      reviews: z.object({
        total: intCountSchema,
        byStatus: z.record(z.string(), intCountSchema),
      }),
      answers: z.object({
        total: intCountSchema,
        archived: intCountSchema,
      }),
      audits: z.object({
        total: intCountSchema,
        byStatus: z.record(z.string(), intCountSchema),
      }),
      jobs: z.object({
        total: intCountSchema,
        byStatus: z.record(z.string(), intCountSchema),
      }),
    })
    .nullable(),
  featuredPages: z.array(dashboardWikiPagePreviewSchema),
  recentSources: z.array(dashboardSourcePreviewSchema),
  reviewFocus: z.array(dashboardReviewPreviewSchema),
  archivedAnswers: z.array(dashboardAnswerPreviewSchema),
  recentAudits: z.array(dashboardAuditPreviewSchema),
  recentActivity: z.array(activityLogEntrySchema),
});

export type DashboardOverview = z.infer<typeof dashboardOverviewSchema>;

export const getDashboardQuerySchema = z.object({
  workspaceRoot: z.string().min(1),
});

export const getDashboardResponseSchema = z.object({
  dashboard: dashboardOverviewSchema,
});
