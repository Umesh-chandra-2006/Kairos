/*
 * Database migration for Kairos Interview Prep Platform
 * Created: 2026-05-09
 * This migration creates all necessary tables for the application
 */

-- Users table
CREATE TABLE `users` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `clerkId` varchar(255) NOT NULL UNIQUE,
  `name` text NOT NULL,
  `email` varchar(320) NOT NULL,
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `profileRole` enum('student','professional'),
  `profileLevel` enum('beginner','intermediate','advanced'),
  `profileTargets` text,
  `notificationTime` varchar(10) DEFAULT '09:00',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `clerkId_idx` (`clerkId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Questions table
CREATE TABLE `questions` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `category` enum('DSA','OS','DBMS','Networks','OOP','SystemDesign','Behavioral') NOT NULL,
  `difficulty` enum('easy','medium','hard') NOT NULL,
  `text` text NOT NULL,
  `rubricHints` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `category_idx` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Answers table with unique constraint to prevent duplicate submissions per day
CREATE TABLE `answers` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `questionId` int NOT NULL,
  `date` varchar(10) NOT NULL COMMENT 'YYYY-MM-DD format',
  `answerText` text NOT NULL,
  `score` int NOT NULL COMMENT '1-10',
  `feedback` text NOT NULL,
  `modelAnswer` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `userId_idx` (`userId`),
  KEY `questionId_idx` (`questionId`),
  KEY `date_idx` (`date`),
  UNIQUE KEY `userId_date_unique` (`userId`, `date`),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Streaks table
CREATE TABLE `streaks` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL UNIQUE,
  `current` int NOT NULL DEFAULT 0,
  `longest` int NOT NULL DEFAULT 0,
  `lastActiveDate` varchar(10) COMMENT 'YYYY-MM-DD format',
  `freezesRemaining` int NOT NULL DEFAULT 1,
  `lastFreezeRefill` varchar(10),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `userId_idx` (`userId`),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
