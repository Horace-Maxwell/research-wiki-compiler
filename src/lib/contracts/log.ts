import { z } from "zod";

export const activityLogKindSchema = z.enum([
  "job_run",
  "review",
  "answer",
  "audit",
  "workspace",
]);
export type ActivityLogKind = z.infer<typeof activityLogKindSchema>;

export const activityLogEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  kind: activityLogKindSchema,
  status: z.string(),
  title: z.string(),
  description: z.string(),
  href: z.string().nullable(),
});

export type ActivityLogEntry = z.infer<typeof activityLogEntrySchema>;

export const listLogsQuerySchema = z.object({
  workspaceRoot: z.string().min(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
});

export const listLogsResponseSchema = z.object({
  logs: z.array(activityLogEntrySchema),
});
