CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('ride_accepted','driver_arriving','driver_arrived','trip_started','trip_completed','ride_cancelled','payment_completed','rating_received','system') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`rideId` int,
	`relatedUserId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
