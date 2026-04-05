ALTER TABLE `job_runs` ADD `source_document_id` text REFERENCES source_documents(id);--> statement-breakpoint
ALTER TABLE `source_documents` ADD `summary_status` text DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE `source_documents` ADD `summary_markdown_path` text;--> statement-breakpoint
ALTER TABLE `source_documents` ADD `summary_json_path` text;--> statement-breakpoint
ALTER TABLE `source_documents` ADD `summary_prompt_hash` text;--> statement-breakpoint
ALTER TABLE `source_documents` ADD `summary_provider` text;--> statement-breakpoint
ALTER TABLE `source_documents` ADD `summary_model` text;--> statement-breakpoint
ALTER TABLE `source_documents` ADD `summary_updated_at` integer;--> statement-breakpoint
ALTER TABLE `source_documents` ADD `summary_error` text;--> statement-breakpoint
ALTER TABLE `source_documents` ADD `summary_metadata_json` text DEFAULT '{}' NOT NULL;