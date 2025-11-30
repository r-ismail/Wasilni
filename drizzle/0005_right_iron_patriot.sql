ALTER TABLE `rides` MODIFY COLUMN `cancelledBy` enum('rider','driver','admin','system');--> statement-breakpoint
ALTER TABLE `rides` ADD `refundAmount` int;--> statement-breakpoint
ALTER TABLE `rides` ADD `refundStatus` enum('pending','processed','rejected');