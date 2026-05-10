CREATE TABLE `answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questionId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`answerText` text NOT NULL,
	`score` int NOT NULL,
	`feedback` text NOT NULL,
	`modelAnswer` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `answers_id` PRIMARY KEY(`id`),
	CONSTRAINT `userId_date_unique` UNIQUE(`userId`,`date`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('DSA','OS','DBMS','Networks','OOP','SystemDesign','Behavioral') NOT NULL,
	`difficulty` enum('easy','medium','hard') NOT NULL,
	`text` text NOT NULL,
	`rubricHints` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
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
	CONSTRAINT `streaks_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_openId_unique`;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `name` text NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `email` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `clerkId` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `profileRole` enum('student','professional');--> statement-breakpoint
ALTER TABLE `users` ADD `profileLevel` enum('beginner','intermediate','advanced');--> statement-breakpoint
ALTER TABLE `users` ADD `profileTargets` text;--> statement-breakpoint
ALTER TABLE `users` ADD `notificationTime` varchar(10) DEFAULT '09:00';--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_clerkId_unique` UNIQUE(`clerkId`);--> statement-breakpoint
ALTER TABLE `answers` ADD CONSTRAINT `answers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `answers` ADD CONSTRAINT `answers_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `streaks` ADD CONSTRAINT `streaks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `userId_idx` ON `answers` (`userId`);--> statement-breakpoint
CREATE INDEX `questionId_idx` ON `answers` (`questionId`);--> statement-breakpoint
CREATE INDEX `date_idx` ON `answers` (`date`);--> statement-breakpoint
CREATE INDEX `category_idx` ON `questions` (`category`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `streaks` (`userId`);--> statement-breakpoint
CREATE INDEX `clerkId_idx` ON `users` (`clerkId`);--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `openId`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `loginMethod`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `lastSignedIn`;