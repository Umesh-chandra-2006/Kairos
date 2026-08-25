CREATE TABLE `analytics_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`collegeId` varchar(64),
	`name` enum('app_open','signup_completed','daily_question_viewed','answer_submitted','eval_completed','practice_started','streak_milestone_viewed','subscription_started','subscription_converted') NOT NULL,
	`props` json,
	`clientTs` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `analytics_events` ADD CONSTRAINT `analytics_events_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `analytics_events_name_created_idx` ON `analytics_events` (`name`,`createdAt`);--> statement-breakpoint
CREATE INDEX `analytics_events_user_idx` ON `analytics_events` (`userId`);