import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with driver-specific fields and role-based access.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["rider", "driver", "admin"]).default("rider").notNull(),
  profilePhoto: text("profilePhoto"),

  // Driver-specific fields
  licenseNumber: varchar("licenseNumber", { length: 50 }),
  driverStatus: mysqlEnum("driverStatus", ["offline", "available", "busy"]).default("offline"),
  currentLatitude: varchar("currentLatitude", { length: 20 }),
  currentLongitude: varchar("currentLongitude", { length: 20 }),
  isVerified: boolean("isVerified").default(false),
  totalRides: int("totalRides").default(0),
  averageRating: int("averageRating").default(0), // Store as integer (rating * 100) to avoid decimal

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  lastLocationUpdate: timestamp("lastLocationUpdate"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Vehicles table for driver cars
 */
export const vehicles = mysqlTable("vehicles", {
  id: int("id").autoincrement().primaryKey(),
  driverId: int("driverId").notNull(),
  make: varchar("make", { length: 50 }).notNull(),
  model: varchar("model", { length: 50 }).notNull(),
  year: int("year").notNull(),
  color: varchar("color", { length: 30 }).notNull(),
  licensePlate: varchar("licensePlate", { length: 20 }).notNull(),
  vehicleType: mysqlEnum("vehicleType", ["economy", "comfort", "premium"]).notNull(),
  capacity: int("capacity").default(4).notNull(),
  photo: text("photo"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = typeof vehicles.$inferInsert;

/**
 * Rides table for tracking all ride requests and completed rides
 */
export const rides = mysqlTable("rides", {
  id: int("id").autoincrement().primaryKey(),
  riderId: int("riderId").notNull(),
  driverId: int("driverId"),
  vehicleId: int("vehicleId"),

  // Location details
  pickupAddress: text("pickupAddress").notNull(),
  pickupLatitude: varchar("pickupLatitude", { length: 20 }).notNull(),
  pickupLongitude: varchar("pickupLongitude", { length: 20 }).notNull(),
  dropoffAddress: text("dropoffAddress").notNull(),
  dropoffLatitude: varchar("dropoffLatitude", { length: 20 }).notNull(),
  dropoffLongitude: varchar("dropoffLongitude", { length: 20 }).notNull(),

  // Ride details
  vehicleType: mysqlEnum("vehicleType", ["economy", "comfort", "premium"]).notNull(),
  status: mysqlEnum("status", [
    "searching",
    "accepted",
    "driver_arriving",
    "arrived",
    "in_progress",
    "completed",
    "cancelled"
  ]).default("searching").notNull(),

  // Pricing (stored as integers in cents to avoid decimal issues)
  estimatedFare: int("estimatedFare").notNull(), // in cents
  actualFare: int("actualFare"), // in cents
  distance: int("distance"), // in meters
  duration: int("duration"), // in seconds

  // Timestamps
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  cancelledAt: timestamp("cancelledAt"),

  cancellationReason: text("cancellationReason"),
  cancelledBy: mysqlEnum("cancelledBy", ["rider", "driver", "admin", "system"]),
  refundAmount: int("refundAmount"), // in cents
  refundStatus: mysqlEnum("refundStatus", ["pending", "processed", "rejected"]),

  // Ride-sharing fields
  isShared: boolean("isShared").default(false).notNull(),
  maxPassengers: int("maxPassengers").default(1).notNull(),
  currentPassengers: int("currentPassengers").default(1).notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Ride = typeof rides.$inferSelect;
export type InsertRide = typeof rides.$inferInsert;

/**
 * Payments table for transaction history
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  rideId: int("rideId").notNull(),
  riderId: int("riderId").notNull(),
  driverId: int("driverId").notNull(),

  amount: int("amount").notNull(), // in cents
  paymentMethod: mysqlEnum("paymentMethod", ["credit_card", "cash", "wallet"]).notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed", "refunded"]).default("pending").notNull(),

  transactionId: varchar("transactionId", { length: 100 }),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Ratings table for driver and rider reviews
 */
export const ratings = mysqlTable("ratings", {
  id: int("id").autoincrement().primaryKey(),
  rideId: int("rideId").notNull(),

  // Rating from rider to driver
  riderToDriverRating: int("riderToDriverRating"), // 1-5 scale
  riderToDriverComment: text("riderToDriverComment"),

  // Rating from driver to rider
  driverToRiderRating: int("driverToRiderRating"), // 1-5 scale
  driverToRiderComment: text("driverToRiderComment"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Rating = typeof ratings.$inferSelect;
export type InsertRating = typeof ratings.$inferInsert;

/**
 * Location tracking table for real-time driver positions during rides
 */
export const locationTracking = mysqlTable("locationTracking", {
  id: int("id").autoincrement().primaryKey(),
  rideId: int("rideId").notNull(),
  driverId: int("driverId").notNull(),
  latitude: varchar("latitude", { length: 20 }).notNull(),
  longitude: varchar("longitude", { length: 20 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type LocationTracking = typeof locationTracking.$inferSelect;
export type InsertLocationTracking = typeof locationTracking.$inferInsert;

/**
 * Ride passengers table for tracking multiple passengers in shared rides
 */
export const ridePassengers = mysqlTable("ridePassengers", {
  id: int("id").autoincrement().primaryKey(),
  rideId: int("rideId").notNull(),
  passengerId: int("passengerId").notNull(),

  // Individual passenger pickup/dropoff
  pickupAddress: text("pickupAddress").notNull(),
  pickupLatitude: varchar("pickupLatitude", { length: 20 }).notNull(),
  pickupLongitude: varchar("pickupLongitude", { length: 20 }).notNull(),
  dropoffAddress: text("dropoffAddress").notNull(),
  dropoffLatitude: varchar("dropoffLatitude", { length: 20 }).notNull(),
  dropoffLongitude: varchar("dropoffLongitude", { length: 20 }).notNull(),

  // Individual fare (split from total)
  fare: int("fare").notNull(), // in cents
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "completed", "failed"]).default("pending").notNull(),

  // Status for this passenger
  status: mysqlEnum("status", [
    "waiting",
    "picked_up",
    "dropped_off"
  ]).default("waiting").notNull(),

  pickedUpAt: timestamp("pickedUpAt"),
  droppedOffAt: timestamp("droppedOffAt"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RidePassenger = typeof ridePassengers.$inferSelect;
export type InsertRidePassenger = typeof ridePassengers.$inferInsert;

/**
 * Saved locations (favorites) for quick address selection
 */
export const savedLocations = mysqlTable("savedLocations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),

  label: varchar("label", { length: 100 }).notNull(), // e.g., "Home", "Work", "Gym"
  address: text("address").notNull(),
  latitude: varchar("latitude", { length: 20 }).notNull(),
  longitude: varchar("longitude", { length: 20 }).notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SavedLocation = typeof savedLocations.$inferSelect;
export type InsertSavedLocation = typeof savedLocations.$inferInsert;

/**
 * Recent locations for quick re-selection
 */
export const recentLocations = mysqlTable("recentLocations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),

  address: text("address").notNull(),
  latitude: varchar("latitude", { length: 20 }).notNull(),
  longitude: varchar("longitude", { length: 20 }).notNull(),

  usedAt: timestamp("usedAt").defaultNow().notNull(),
});

export type RecentLocation = typeof recentLocations.$inferSelect;
export type InsertRecentLocation = typeof recentLocations.$inferInsert;

/**
 * Notifications table for in-app notification center
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),

  type: mysqlEnum("type", [
    "ride_accepted",
    "driver_arriving",
    "driver_arrived",
    "trip_started",
    "trip_completed",
    "ride_cancelled",
    "payment_completed",
    "rating_received",
    "system"
  ]).notNull(),

  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),

  // Related entities
  rideId: int("rideId"),
  relatedUserId: int("relatedUserId"), // Driver/Rider who triggered the notification

  isRead: boolean("isRead").default(false).notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
