ALTER TABLE `answers` DROP INDEX `answers_user_date_idx`;--> statement-breakpoint
ALTER TABLE `questions` MODIFY COLUMN `category` enum('DSA','OS','DBMS','Networks','OOP','SystemDesign','Behavioral','FullStack','Frontend','Backend','HR','Cloud','Security','Testing','DevOps','Mobile','MachineLearning','Agile','Product') NOT NULL;--> statement-breakpoint
ALTER TABLE `answers` ADD `dailyKey` varchar(10);--> statement-breakpoint
ALTER TABLE `questions` ADD `practiceOnly` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `answers` ADD CONSTRAINT `answers_user_dailykey_idx` UNIQUE(`userId`,`dailyKey`);