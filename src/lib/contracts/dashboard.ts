import { z } from "zod";

import { activityLogEntrySchema } from "@/lib/contracts/log";

const intCountSchema = z.number().int().nonnegative();

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
  recentActivity: z.array(activityLogEntrySchema),
});

export type DashboardOverview = z.infer<typeof dashboardOverviewSchema>;

export const getDashboardQuerySchema = z.object({
  workspaceRoot: z.string().min(1),
});

export const getDashboardResponseSchema = z.object({
  dashboard: dashboardOverviewSchema,
});
