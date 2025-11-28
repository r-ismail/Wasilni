CREATE TABLE `locationTracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rideId` int NOT NULL,
	`driverId` int NOT NULL,
	`latitude` varchar(20) NOT NULL,
	`longitude` varchar(20) NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `locationTracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rideId` int NOT NULL,
	`riderId` int NOT NULL,
	`driverId` int NOT NULL,
	`amount` int NOT NULL,
	`paymentMethod` enum('credit_card','cash','wallet') NOT NULL,
	`status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`transactionId` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ratings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rideId` int NOT NULL,
	`riderToDriverRating` int,
	`riderToDriverComment` text,
	`driverToRiderRating` int,
	`driverToRiderComment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ratings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`riderId` int NOT NULL,
	`driverId` int,
	`vehicleId` int,
	`pickupAddress` text NOT NULL,
	`pickupLatitude` varchar(20) NOT NULL,
	`pickupLongitude` varchar(20) NOT NULL,
	`dropoffAddress` text NOT NULL,
	`dropoffLatitude` varchar(20) NOT NULL,
	`dropoffLongitude` varchar(20) NOT NULL,
	`vehicleType` enum('economy','comfort','premium') NOT NULL,
	`status` enum('searching','accepted','driver_arriving','in_progress','completed','cancelled') NOT NULL DEFAULT 'searching',
	`estimatedFare` int NOT NULL,
	`actualFare` int,
	`distance` int,
	`duration` int,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`acceptedAt` timestamp,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`cancelledAt` timestamp,
	`cancellationReason` text,
	`cancelledBy` enum('rider','driver','admin'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverId` int NOT NULL,
	`make` varchar(50) NOT NULL,
	`model` varchar(50) NOT NULL,
	`year` int NOT NULL,
	`color` varchar(30) NOT NULL,
	`licensePlate` varchar(20) NOT NULL,
	`vehicleType` enum('economy','comfort','premium') NOT NULL,
	`capacity` int NOT NULL DEFAULT 4,
	`photo` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('rider','driver','admin') NOT NULL DEFAULT 'rider';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `profilePhoto` text;--> statement-breakpoint
ALTER TABLE `users` ADD `licenseNumber` varchar(50);--> statement-breakpoint
ALTER TABLE `users` ADD `driverStatus` enum('offline','available','busy') DEFAULT 'offline';--> statement-breakpoint
ALTER TABLE `users` ADD `currentLatitude` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `currentLongitude` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `isVerified` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `totalRides` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `averageRating` int DEFAULT 0;