CREATE TABLE `skills` (
  `id` varchar(32) NOT NULL,
  `name` varchar(64) NOT NULL,
  `description` varchar(280) NOT NULL,
  `category` varchar(32) NOT NULL DEFAULT 'general',
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;--> statement-breakpoint

CREATE TABLE `user_skill_state` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `skillId` varchar(32) NOT NULL,
  `score` real NOT NULL DEFAULT 0,
  `confidence` real NOT NULL DEFAULT 0,
  `evidenceCount` int NOT NULL DEFAULT 0,
  `lastAssessedAt` timestamp,
  `trend` varchar(16) DEFAULT 'stable',
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_skill_state_user_skill_idx` (`userId`, `skillId`),
  KEY `user_skill_state_skill_idx` (`skillId`),
  KEY `user_skill_state_user_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;--> statement-breakpoint

CREATE TABLE `skill_evidence` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `skillId` varchar(32) NOT NULL,
  `answerId` int NOT NULL,
  `evaluationVersionId` int,
  `score` real NOT NULL,
  `band` varchar(16) NOT NULL,
  `evidence` json,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  KEY `skill_evidence_user_skill_idx` (`userId`, `skillId`),
  KEY `skill_evidence_answer_idx` (`answerId`),
  KEY `skill_evidence_user_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;--> statement-breakpoint

INSERT INTO `skills` (`id`, `name`, `description`, `category`) VALUES
  ('technical_explanation', 'Technical Explanation', 'Ability to explain technical concepts accurately and thoroughly', 'content'),
  ('structure', 'Answer Structure', 'Organized, logical flow with clear beginning, middle, and end', 'structure'),
  ('conciseness', 'Conciseness', 'Getting to the point without unnecessary filler', 'structure'),
  ('relevance', 'Relevance', 'Staying on topic and addressing what was asked', 'content'),
  ('clarity', 'Clarity', 'Clear communication that is easy to follow', 'delivery'),
  ('fluency', 'Fluency', 'Smooth, natural speech without excessive fillers', 'delivery'),
  ('composure', 'Composure', 'Managing pauses and maintaining steady delivery under pressure', 'delivery'),
  ('domain_depth', 'Domain Depth', 'Demonstrating deep knowledge with concrete examples', 'content'),
  ('conclusion_strength', 'Conclusion Strength', 'Ending with a clear, memorable summary or takeaway', 'structure'),
  ('delivery_quality', 'Delivery Quality', 'Overall vocal presence, pacing, and engagement', 'delivery');
