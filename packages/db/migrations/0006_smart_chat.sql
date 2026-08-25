ALTER TABLE `answers` ADD `audioKey` varchar(255);--> statement-breakpoint
ALTER TABLE `answers` ADD `transcript` text;--> statement-breakpoint
ALTER TABLE `answers` ADD `durationMs` int;--> statement-breakpoint
ALTER TABLE `answers` ADD `languageBlocked` boolean DEFAULT false NOT NULL;