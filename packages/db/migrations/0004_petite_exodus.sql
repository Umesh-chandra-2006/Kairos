CREATE TABLE `feature_flags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` enum('voice_v2','new_evaluator','delivery_metrics','adaptive_followup','skill_engine','adaptive_question_selection','tpo_dashboard','whatsapp') NOT NULL,
	`envScope` enum('development','test','production') NOT NULL,
	`collegeId` varchar(64),
	`enabled` boolean NOT NULL,
	`rolloutPercent` int NOT NULL DEFAULT 100,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `feature_flags_id` PRIMARY KEY(`id`),
	CONSTRAINT `feature_flags_scope_idx` UNIQUE(`key`,`envScope`,`collegeId`)
);
