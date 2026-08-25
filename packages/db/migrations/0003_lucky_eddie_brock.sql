CREATE TABLE `evaluation_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`answerId` int NOT NULL,
	`contractVersion` int NOT NULL,
	`evaluatorVersion` varchar(64) NOT NULL,
	`promptVersion` varchar(64) NOT NULL,
	`rubricVersion` varchar(64) NOT NULL,
	`provider` varchar(32) NOT NULL,
	`modelVersion` varchar(128) NOT NULL,
	`overallBand` enum('needs_work','solid','strong') NOT NULL,
	`languageBlocked` boolean NOT NULL DEFAULT false,
	`result` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evaluation_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `answers` MODIFY COLUMN `status` enum('pending','evaluating','completed','failed','created','queued','processing','cancelled') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `answers` ADD `idempotencyKey` varchar(64);--> statement-breakpoint
ALTER TABLE `answers` ADD CONSTRAINT `answers_user_idem_idx` UNIQUE(`userId`,`idempotencyKey`);--> statement-breakpoint
ALTER TABLE `evaluation_versions` ADD CONSTRAINT `evaluation_versions_answerId_answers_id_fk` FOREIGN KEY (`answerId`) REFERENCES `answers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `evaluation_versions_answer_idx` ON `evaluation_versions` (`answerId`);--> statement-breakpoint
CREATE INDEX `evaluation_versions_answer_version_idx` ON `evaluation_versions` (`answerId`,`contractVersion`);