CREATE TABLE `subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `stripeCustomerId` varchar(128),
  `stripeSubscriptionId` varchar(128),
  `plan` varchar(32) NOT NULL DEFAULT 'free',
  `status` varchar(32) NOT NULL DEFAULT 'active',
  `currentPeriodStart` timestamp,
  `currentPeriodEnd` timestamp,
  `cancelAtPeriodEnd` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `subscriptions_user_idx` (`userId`),
  UNIQUE KEY `subscriptions_stripe_customer_idx` (`stripeCustomerId`),
  UNIQUE KEY `subscriptions_stripe_sub_idx` (`stripeSubscriptionId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;--> statement-breakpoint

CREATE TABLE `usage_tracking` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `date` varchar(10) NOT NULL,
  `evaluationsUsed` int NOT NULL DEFAULT 0,
  `evaluationsLimit` int NOT NULL DEFAULT 3,
  `voiceMinutesUsed` int NOT NULL DEFAULT 0,
  `voiceMinutesLimit` int NOT NULL DEFAULT 10,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `usage_tracking_user_date_idx` (`userId`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;--> statement-breakpoint

CREATE TABLE `consent_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `consentType` varchar(64) NOT NULL,
  `granted` tinyint(1) NOT NULL,
  `ipAddress` varchar(45),
  `userAgent` varchar(255),
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  KEY `consent_log_user_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;--> statement-breakpoint

CREATE TABLE `data_deletions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'pending',
  `requestedAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `processedAt` timestamp,
  `error` varchar(500),
  PRIMARY KEY (`id`),
  KEY `data_deletions_user_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;