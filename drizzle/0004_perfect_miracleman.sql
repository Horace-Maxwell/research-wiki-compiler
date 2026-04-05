ALTER TABLE `patch_proposals` ADD `proposal_type` text DEFAULT 'update_page' NOT NULL;--> statement-breakpoint
ALTER TABLE `patch_proposals` ADD `prompt_hash` text;--> statement-breakpoint
ALTER TABLE `patch_proposals` ADD `provider` text;--> statement-breakpoint
ALTER TABLE `patch_proposals` ADD `model` text;--> statement-breakpoint
ALTER TABLE `patch_proposals` ADD `target_page_title` text;--> statement-breakpoint
ALTER TABLE `patch_proposals` ADD `proposed_page_title` text;--> statement-breakpoint
ALTER TABLE `patch_proposals` ADD `artifact_markdown_path` text;--> statement-breakpoint
ALTER TABLE `patch_proposals` ADD `artifact_json_path` text;--> statement-breakpoint
CREATE INDEX `patch_proposals_source_document_idx` ON `patch_proposals` (`source_document_id`);