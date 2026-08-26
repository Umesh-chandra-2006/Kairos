ALTER TABLE `users` ADD COLUMN `collegeId` varchar(64);--> statement-breakpoint

ALTER TABLE `users`
  MODIFY COLUMN `role` enum('user','admin','tpo') NOT NULL DEFAULT 'user';--> statement-breakpoint

CREATE TABLE `band_confirmations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `answerId` int NOT NULL,
  `userId` int NOT NULL,
  `confirmed` tinyint(1) NOT NULL DEFAULT 1,
  `comment` varchar(500),
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `band_confirmations_answer_user_idx` (`answerId`, `userId`),
  KEY `band_confirmations_user_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;--> statement-breakpoint

CREATE TABLE `outcome_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `collegeId` varchar(64) NOT NULL,
  `interviewsAttended` int DEFAULT 0,
  `companies` json,
  `roundsReached` json,
  `result` varchar(20),
  `offers` int DEFAULT 0,
  `notes` text,
  `selfReportedAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  KEY `outcome_reports_user_idx` (`userId`),
  KEY `outcome_reports_college_idx` (`collegeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;--> statement-breakpoint

CREATE TABLE `tpo_views` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `collegeId` varchar(64) NOT NULL,
  `queryType` varchar(50) NOT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  KEY `tpo_views_user_idx` (`userId`),
  KEY `tpo_views_college_idx` (`collegeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;--> statement-breakpoint

ALTER TABLE `notification_outbox`
  MODIFY COLUMN `type` enum('eval_completed','streak_milestone','streak_reminder','weekly_summary','weekly_digest','band_confirmation') NOT NULL;
