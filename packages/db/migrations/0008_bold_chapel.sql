ALTER TABLE `questions` ADD COLUMN `rubricJson` json DEFAULT NULL;--> statement-breakpoint

CREATE TABLE `model_answers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `questionId` int NOT NULL,
  `level` varchar(20) NOT NULL DEFAULT 'intermediate',
  `content` text NOT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `model_answers_question_level_idx` (`questionId`, `level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;--> statement-breakpoint

CREATE TABLE `follow_ups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `parentId` int NOT NULL,
  `userId` int NOT NULL,
  `questionText` text NOT NULL,
  `weakAreas` json,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  KEY `follow_ups_user_idx` (`userId`),
  KEY `follow_ups_parent_idx` (`parentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;--> statement-breakpoint

ALTER TABLE `notification_outbox`
  MODIFY COLUMN `type` enum('eval_completed','streak_milestone','streak_reminder','weekly_summary','weekly_digest') NOT NULL;