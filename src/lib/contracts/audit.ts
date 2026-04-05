import { z } from "zod";

import { AUDIT_MODES, AUDIT_RUN_STATUSES } from "@/lib/constants";

export const auditModeSchema = z.enum(AUDIT_MODES);
export type AuditMode = z.infer<typeof auditModeSchema>;

export const auditRunStatusSchema = z.enum(AUDIT_RUN_STATUSES);
export type AuditRunStatus = z.infer<typeof auditRunStatusSchema>;

export const auditSeveritySchema = z.enum(["low", "medium", "high"]);
export type AuditSeverity = z.infer<typeof auditSeveritySchema>;

export const auditFindingSchema = z.object({
  id: z.string(),
  mode: auditModeSchema,
  severity: auditSeveritySchema,
  title: z.string().min(1),
  note: z.string().min(1),
  relatedPageIds: z.array(z.string()).default([]),
  relatedPagePaths: z.array(z.string()).default([]),
  relatedSourceIds: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type AuditFinding = z.infer<typeof auditFindingSchema>;

export const auditSeverityCountsSchema = z.object({
  low: z.number().int().nonnegative(),
  medium: z.number().int().nonnegative(),
  high: z.number().int().nonnegative(),
});

export type AuditSeverityCounts = z.infer<typeof auditSeverityCountsSchema>;

export const auditRunSummarySchema = z.object({
  id: z.string(),
  mode: auditModeSchema,
  status: auditRunStatusSchema,
  reportPath: z.string().nullable(),
  findingCount: z.number().int().nonnegative(),
  severityCounts: auditSeverityCountsSchema,
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});

export type AuditRunSummary = z.infer<typeof auditRunSummarySchema>;

export const auditRunDetailSchema = auditRunSummarySchema.extend({
  findings: z.array(auditFindingSchema),
  reportMarkdown: z.string().nullable(),
});

export type AuditRunDetail = z.infer<typeof auditRunDetailSchema>;

export const runAuditRequestSchema = z.object({
  workspaceRoot: z.string().min(1),
  mode: auditModeSchema,
});

export const runAuditResponseSchema = z.object({
  audit: auditRunDetailSchema,
});

export const listAuditsQuerySchema = z.object({
  workspaceRoot: z.string().min(1),
});

export const listAuditsResponseSchema = z.object({
  audits: z.array(auditRunSummarySchema),
});

export const getAuditQuerySchema = z.object({
  workspaceRoot: z.string().min(1),
});
