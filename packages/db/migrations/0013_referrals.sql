CREATE TABLE `referral_codes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `code` varchar(16) NOT NULL,
  `maxUses` int NOT NULL DEFAULT 10,
  `useCount` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `referral_codes_user_idx` (`userId`),
  UNIQUE INDEX `referral_codes_code_idx` (`code`),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;--> statement-breakpoint

CREATE TABLE `referral_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `referrerUserId` int NOT NULL,
  `referredUserId` int NOT NULL,
  `referralCode` varchar(16) NOT NULL,
  `referrerRewardDays` int NOT NULL DEFAULT 7,
  `referredRewardDays` int NOT NULL DEFAULT 3,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `referral_events_referrer_idx` (`referrerUserId`),
  INDEX `referral_events_referred_idx` (`referredUserId`),
  FOREIGN KEY (`referrerUserId`) REFERENCES `users`(`id`) ON DELETE cascade,
  FOREIGN KEY (`referredUserId`) REFERENCES `users`(`id`) ON DELETE cascade
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
