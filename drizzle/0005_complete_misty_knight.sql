ALTER TABLE `patch_proposals` ADD `reviewed_at` integer;--> statement-breakpoint
ALTER TABLE `patch_proposals` ADD `review_note` text;--> statement-breakpoint
ALTER TABLE `patch_proposals` ADD `applied_at` integer;--> statement-breakpoint
ALTER TABLE `patch_proposals` ADD `apply_error` text;--> statement-breakpoint
ALTER TABLE `patch_proposals` ADD `applied_page_id` text REFERENCES wiki_pages(id);--> statement-breakpoint
ALTER TABLE `patch_proposals` ADD `apply_metadata_json` text DEFAULT '{}' NOT NULL;