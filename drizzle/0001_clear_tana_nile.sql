DROP INDEX `wiki_pages_path_idx`;--> statement-breakpoint
ALTER TABLE `wiki_pages` ADD `folder` text NOT NULL;--> statement-breakpoint
ALTER TABLE `wiki_pages` ADD `source_refs_json` text NOT NULL;--> statement-breakpoint
ALTER TABLE `wiki_pages` ADD `page_refs_json` text NOT NULL;--> statement-breakpoint
ALTER TABLE `wiki_pages` ADD `confidence` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `wiki_pages` ADD `last_indexed_at` integer NOT NULL;--> statement-breakpoint
CREATE INDEX `wiki_pages_slug_idx` ON `wiki_pages` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `wiki_pages_workspace_path_idx` ON `wiki_pages` (`workspace_id`,`path`);--> statement-breakpoint
ALTER TABLE `page_links` ADD `resolution_kind` text;