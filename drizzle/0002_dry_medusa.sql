ALTER TABLE `source_chunks` ADD `start_offset` integer;--> statement-breakpoint
ALTER TABLE `source_chunks` ADD `end_offset` integer;--> statement-breakpoint
ALTER TABLE `source_chunks` ADD `checksum` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `source_documents` ADD `source_type` text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `source_documents` ADD `original_path` text;--> statement-breakpoint
ALTER TABLE `source_documents` ADD `checksum` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `source_documents` ADD `imported_at` integer;--> statement-breakpoint
ALTER TABLE `source_documents` ADD `processed_at` integer;--> statement-breakpoint
ALTER TABLE `source_documents` ADD `language` text DEFAULT 'und' NOT NULL;--> statement-breakpoint
ALTER TABLE `source_documents` ADD `metadata_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `source_documents` ADD `raw_text_extracted` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `source_documents` ADD `token_estimate` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `source_documents` ADD `failure_reason` text;--> statement-breakpoint
ALTER TABLE `source_documents` ADD `original_external_path` text;--> statement-breakpoint
CREATE INDEX `source_documents_status_idx` ON `source_documents` (`status`);