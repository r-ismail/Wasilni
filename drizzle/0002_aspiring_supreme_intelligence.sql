CREATE TABLE `ridePassengers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rideId` int NOT NULL,
	`passengerId` int NOT NULL,
	`pickupAddress` text NOT NULL,
	`pickupLatitude` varchar(20) NOT NULL,
	`pickupLongitude` varchar(20) NOT NULL,
	`dropoffAddress` text NOT NULL,
	`dropoffLatitude` varchar(20) NOT NULL,
	`dropoffLongitude` varchar(20) NOT NULL,
	`fare` int NOT NULL,
	`paymentStatus` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`status` enum('waiting','picked_up','dropped_off') NOT NULL DEFAULT 'waiting',
	`pickedUpAt` timestamp,
	`droppedOffAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ridePassengers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `rides` ADD `isShared` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `rides` ADD `maxPassengers` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `rides` ADD `currentPassengers` int DEFAULT 1 NOT NULL;