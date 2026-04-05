CREATE TABLE `answer_artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`question` text NOT NULL,
	`short_answer` text NOT NULL,
	`detailed_answer` text NOT NULL,
	`citations_json` text NOT NULL,
	`based_on_pages_json` text NOT NULL,
	`caveats_json` text NOT NULL,
	`archived_page_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`archived_page_id`) REFERENCES `wiki_pages`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `answer_artifacts_workspace_idx` ON `answer_artifacts` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `app_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`key` text NOT NULL,
	`value_json` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `app_settings_workspace_idx` ON `app_settings` (`workspace_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `app_settings_workspace_key_idx` ON `app_settings` (`workspace_id`,`key`);--> statement-breakpoint
CREATE TABLE `audit_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`mode` text NOT NULL,
	`status` text NOT NULL,
	`report_path` text,
	`findings_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `audit_runs_workspace_idx` ON `audit_runs` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `claims` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`page_id` text,
	`document_id` text,
	`text` text NOT NULL,
	`polarity` text NOT NULL,
	`evidence_strength` text NOT NULL,
	`contradiction_group_id` text,
	`citations_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`page_id`) REFERENCES `wiki_pages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_id`) REFERENCES `source_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `claims_workspace_idx` ON `claims` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `claims_contradiction_group_idx` ON `claims` (`contradiction_group_id`);--> statement-breakpoint
CREATE TABLE `concept_mentions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`page_id` text,
	`document_id` text,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`mention_count` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`page_id`) REFERENCES `wiki_pages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_id`) REFERENCES `source_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `concept_mentions_workspace_idx` ON `concept_mentions` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `concept_mentions_normalized_name_idx` ON `concept_mentions` (`normalized_name`);--> statement-breakpoint
CREATE TABLE `entity_mentions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`page_id` text,
	`document_id` text,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`mention_count` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`page_id`) REFERENCES `wiki_pages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_id`) REFERENCES `source_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `entity_mentions_workspace_idx` ON `entity_mentions` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `entity_mentions_normalized_name_idx` ON `entity_mentions` (`normalized_name`);--> statement-breakpoint
CREATE TABLE `job_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`job_type` text NOT NULL,
	`status` text NOT NULL,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`duration_ms` integer,
	`metadata_json` text,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `job_runs_workspace_idx` ON `job_runs` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `job_runs_job_type_idx` ON `job_runs` (`job_type`);--> statement-breakpoint
CREATE TABLE `page_links` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`source_page_id` text NOT NULL,
	`target_page_id` text,
	`target_title` text NOT NULL,
	`link_text` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_page_id`) REFERENCES `wiki_pages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_page_id`) REFERENCES `wiki_pages`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `page_links_workspace_idx` ON `page_links` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `page_links_source_idx` ON `page_links` (`source_page_id`);--> statement-breakpoint
CREATE TABLE `patch_hunks` (
	`id` text PRIMARY KEY NOT NULL,
	`proposal_id` text NOT NULL,
	`section_heading` text,
	`operation` text NOT NULL,
	`before_text` text,
	`after_text` text,
	`citations_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`proposal_id`) REFERENCES `patch_proposals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `patch_hunks_proposal_idx` ON `patch_hunks` (`proposal_id`);--> statement-breakpoint
CREATE TABLE `patch_proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`source_document_id` text,
	`target_page_id` text,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`risk_level` text NOT NULL,
	`prompt_version` text NOT NULL,
	`rationale` text NOT NULL,
	`affected_sections_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_document_id`) REFERENCES `source_documents`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`target_page_id`) REFERENCES `wiki_pages`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `patch_proposals_workspace_idx` ON `patch_proposals` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `patch_proposals_status_idx` ON `patch_proposals` (`status`);--> statement-breakpoint
CREATE TABLE `source_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`chunk_index` integer NOT NULL,
	`content` text NOT NULL,
	`token_count` integer,
	`char_count` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `source_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `source_chunks_document_idx` ON `source_chunks` (`document_id`,`chunk_index`);--> statement-breakpoint
CREATE TABLE `source_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`ingestion_method` text NOT NULL,
	`canonical_url` text,
	`author` text,
	`published_at` integer,
	`raw_path` text,
	`normalized_path` text,
	`processing_version` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `source_documents_workspace_idx` ON `source_documents` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `source_documents_slug_idx` ON `source_documents` (`slug`);--> statement-breakpoint
CREATE TABLE `wiki_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`title` text NOT NULL,
	`canonical_title` text NOT NULL,
	`slug` text NOT NULL,
	`type` text NOT NULL,
	`path` text NOT NULL,
	`aliases_json` text NOT NULL,
	`tags_json` text NOT NULL,
	`importance_score` real DEFAULT 0 NOT NULL,
	`quality_score` real DEFAULT 0 NOT NULL,
	`source_coverage_score` real DEFAULT 0 NOT NULL,
	`review_status` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `wiki_pages_workspace_idx` ON `wiki_pages` (`workspace_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `wiki_pages_path_idx` ON `wiki_pages` (`path`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`root_path` text NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`git_enabled` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspaces_root_path_idx` ON `workspaces` (`root_path`);