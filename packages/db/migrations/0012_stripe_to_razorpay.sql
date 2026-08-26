ALTER TABLE `subscriptions` ADD COLUMN `paymentCustomerId` varchar(128);--> statement-breakpoint

ALTER TABLE `subscriptions` ADD COLUMN `paymentSubscriptionId` varchar(128);--> statement-breakpoint

UPDATE `subscriptions` SET `paymentCustomerId` = `stripeCustomerId`, `paymentSubscriptionId` = `stripeSubscriptionId` WHERE 1=1;--> statement-breakpoint

ALTER TABLE `subscriptions` DROP INDEX `subscriptions_stripe_customer_idx`;--> statement-breakpoint

ALTER TABLE `subscriptions` DROP INDEX `subscriptions_stripe_sub_idx`;--> statement-breakpoint

ALTER TABLE `subscriptions` DROP COLUMN `stripeCustomerId`;--> statement-breakpoint

ALTER TABLE `subscriptions` DROP COLUMN `stripeSubscriptionId`;--> statement-breakpoint

ALTER TABLE `subscriptions` ADD UNIQUE INDEX `subscriptions_customer_idx` (`paymentCustomerId`);--> statement-breakpoint

ALTER TABLE `subscriptions` ADD UNIQUE INDEX `subscriptions_sub_idx` (`paymentSubscriptionId`);