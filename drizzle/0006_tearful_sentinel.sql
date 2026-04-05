ALTER TABLE `answer_artifacts` ADD `follow_up_questions_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `answer_artifacts` ADD `metadata_json` text DEFAULT '{}' NOT NULL;