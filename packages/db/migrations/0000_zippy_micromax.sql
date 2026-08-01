CREATE TABLE `answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questionId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`answerText` text NOT NULL,
	`score` int,
	`feedback` text,
	`modelAnswer` text,
	`status` enum('pending','evaluating','completed','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `answers_id` PRIMARY KEY(`id`),
	CONSTRAINT `answers_user_date_idx` UNIQUE(`userId`,`date`)
);
--> statement-breakpoint
CREATE TABLE `daily_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questionId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daily_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_assignments_user_date_idx` UNIQUE(`userId`,`date`)
);
--> statement-breakpoint
CREATE TABLE `email_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`type` enum('verify_email','reset_password') NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_tokens_hash_idx` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `notification_outbox` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('eval_completed','streak_milestone','streak_reminder') NOT NULL,
	`channel` enum('web_push','expo_push','email') NOT NULL,
	`payload` json,
	`status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`lastAttemptAt` timestamp,
	`sentAt` timestamp,
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_outbox_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_prefs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pushEnabled` boolean NOT NULL DEFAULT true,
	`evalNotifications` boolean NOT NULL DEFAULT true,
	`streakReminder` boolean NOT NULL DEFAULT false,
	`reminderTime` varchar(5) NOT NULL DEFAULT '09:00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_prefs_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_prefs_user_idx` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`channel` enum('web','expo') NOT NULL,
	`token` varchar(512) NOT NULL,
	`keys` json DEFAULT ('null'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `push_subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `push_subscriptions_user_token_idx` UNIQUE(`userId`,`channel`,`token`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('DSA','OS','DBMS','Networks','OOP','SystemDesign','Behavioral') NOT NULL,
	`difficulty` enum('easy','medium','hard') NOT NULL,
	`text` text NOT NULL,
	`rubricHints` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`ip` varchar(45),
	`userAgent` varchar(255),
	CONSTRAINT `refresh_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `refresh_tokens_hash_idx` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `streaks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`current` int NOT NULL DEFAULT 0,
	`longest` int NOT NULL DEFAULT 0,
	`lastActiveDate` varchar(10),
	`freezesRemaining` int NOT NULL DEFAULT 1,
	`lastFreezeRefill` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `streaks_id` PRIMARY KEY(`id`),
	CONSTRAINT `streaks_user_idx` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`name` varchar(120),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`emailVerified` boolean NOT NULL DEFAULT false,
	`profile` json DEFAULT ('null'),
	`timezone` varchar(64) DEFAULT 'Asia/Kolkata',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_idx` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `answers` ADD CONSTRAINT `answers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `answers` ADD CONSTRAINT `answers_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_assignments` ADD CONSTRAINT `daily_assignments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_assignments` ADD CONSTRAINT `daily_assignments_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_tokens` ADD CONSTRAINT `email_tokens_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_outbox` ADD CONSTRAINT `notification_outbox_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_prefs` ADD CONSTRAINT `notification_prefs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `push_subscriptions` ADD CONSTRAINT `push_subscriptions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `streaks` ADD CONSTRAINT `streaks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `answers_user_created_idx` ON `answers` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `answers_question_idx` ON `answers` (`questionId`);--> statement-breakpoint
CREATE INDEX `daily_assignments_question_date_idx` ON `daily_assignments` (`questionId`,`date`);--> statement-breakpoint
CREATE INDEX `email_tokens_user_type_idx` ON `email_tokens` (`userId`,`type`);--> statement-breakpoint
CREATE INDEX `notification_outbox_status_idx` ON `notification_outbox` (`status`);--> statement-breakpoint
CREATE INDEX `notification_outbox_user_idx` ON `notification_outbox` (`userId`);--> statement-breakpoint
CREATE INDEX `questions_cat_diff_idx` ON `questions` (`category`,`difficulty`);--> statement-breakpoint
CREATE INDEX `questions_active_idx` ON `questions` (`isActive`);--> statement-breakpoint
CREATE INDEX `refresh_tokens_user_idx` ON `refresh_tokens` (`userId`);--> statement-breakpoint
CREATE INDEX `refresh_tokens_expiry_idx` ON `refresh_tokens` (`expiresAt`);