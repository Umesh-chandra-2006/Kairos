-- Spaced repetition: per-user per-question review schedule.
-- SM-2 algorithm parameters + next review date for due-review queries.

CREATE TABLE `user_questions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `questionId` int NOT NULL,
  `nextReviewAt` varchar(10) NOT NULL COMMENT 'YYYY-MM-DD',
  `intervalDays` int NOT NULL DEFAULT 1,
  `easeFactor` real NOT NULL DEFAULT 2.5,
  `lastReviewedAt` varchar(10),
  `reviewCount` int NOT NULL DEFAULT 0,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_questions_user_question_idx` (`userId`, `questionId`),
  KEY `user_questions_next_review_idx` (`userId`, `nextReviewAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Backfill: seed initial reviews for all completed daily answers so
-- existing users have a starting review schedule.
INSERT IGNORE INTO `user_questions` (`userId`, `questionId`, `nextReviewAt`, `intervalDays`, `easeFactor`, `reviewCount`, `createdAt`, `updatedAt`)
SELECT
  a.`userId`,
  a.`questionId`,
  DATE_ADD(CURDATE(), INTERVAL 1 DAY) AS `nextReviewAt`,
  1 AS `intervalDays`,
  2.5 AS `easeFactor`,
  1 AS `reviewCount`,
  a.`createdAt`,
  a.`updatedAt`
FROM `answers` a
WHERE a.`status` = 'completed'
  AND a.`dailyKey` IS NOT NULL
  AND a.`score` IS NOT NULL;
