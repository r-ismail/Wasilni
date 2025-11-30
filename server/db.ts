import { eq, and, desc, sql, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  rides, 
  InsertRide,
  vehicles,
  InsertVehicle,
  payments,
  InsertPayment,
  ratings,
  InsertRating,
  locationTracking,
  InsertLocationTracking,
  ridePassengers,
  InsertRidePassenger,
  savedLocations,
  InsertSavedLocation,
  recentLocations,
  InsertRecentLocation
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER OPERATIONS ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "phone", "profilePhoto", "licenseNumber", "currentLatitude", "currentLongitude"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (user.driverStatus !== undefined) {
      values.driverStatus = user.driverStatus;
      updateSet.driverStatus = user.driverStatus;
    }
    if (user.isVerified !== undefined) {
      values.isVerified = user.isVerified;
      updateSet.isVerified = user.isVerified;
    }
    if (user.totalRides !== undefined) {
      values.totalRides = user.totalRides;
      updateSet.totalRides = user.totalRides;
    }
    if (user.averageRating !== undefined) {
      values.averageRating = user.averageRating;
      updateSet.averageRating = user.averageRating;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserRole(userId: number, role: "rider" | "driver" | "admin") {
  const db = await getDb();
  if (!db) return;
  
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function updateDriverStatus(userId: number, status: "offline" | "available" | "busy") {
  const db = await getDb();
  if (!db) return;
  
  await db.update(users).set({ driverStatus: status }).where(eq(users.id, userId));
}

export async function updateDriverLocation(userId: number, latitude: string, longitude: string) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(users).set({ 
    currentLatitude: latitude, 
    currentLongitude: longitude 
  }).where(eq(users.id, userId));
}

export async function getAvailableDrivers() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(users)
    .where(and(
      eq(users.role, "driver"),
      eq(users.driverStatus, "available"),
      eq(users.isVerified, true)
    ));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(users).orderBy(desc(users.createdAt));
}

// ============ VEHICLE OPERATIONS ============

export async function createVehicle(vehicle: InsertVehicle) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(vehicles).values(vehicle);
  // For MySQL, the result has insertId as a bigint
  const insertId = (result as any)[0]?.insertId || (result as any).insertId;
  return Number(insertId);
}

export async function getVehiclesByDriverId(driverId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(vehicles).where(eq(vehicles.driverId, driverId));
}

export async function getVehicleById(vehicleId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateVehicle(vehicleId: number, updates: Partial<InsertVehicle>) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(vehicles).set(updates).where(eq(vehicles.id, vehicleId));
}

export async function deleteVehicle(vehicleId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(vehicles).where(eq(vehicles.id, vehicleId));
}

// ============ RIDE OPERATIONS ============

export async function createRide(ride: InsertRide) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(rides).values(ride);
  return result;
}

export async function getRideById(rideId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateRideStatus(
  rideId: number, 
  status: "searching" | "accepted" | "driver_arriving" | "arrived" | "in_progress" | "completed" | "cancelled",
  additionalUpdates?: Partial<InsertRide>
) {
  const db = await getDb();
  if (!db) return;
  
  const updates: any = { status, ...additionalUpdates };
  
  // Set timestamps based on status
  if (status === "accepted" && !updates.acceptedAt) {
    updates.acceptedAt = new Date();
  } else if (status === "in_progress" && !updates.startedAt) {
    updates.startedAt = new Date();
  } else if (status === "completed" && !updates.completedAt) {
    updates.completedAt = new Date();
  } else if (status === "cancelled" && !updates.cancelledAt) {
    updates.cancelledAt = new Date();
  }
  
  await db.update(rides).set(updates).where(eq(rides.id, rideId));
}

export async function assignDriverToRide(rideId: number, driverId: number, vehicleId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(rides).set({ 
    driverId, 
    vehicleId,
    status: "accepted",
    acceptedAt: new Date()
  }).where(eq(rides.id, rideId));
}

export async function getPendingRides() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(rides)
    .where(eq(rides.status, "searching"))
    .orderBy(desc(rides.requestedAt));
}

export async function getActiveRides() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(rides)
    .where(or(
      eq(rides.status, "accepted"),
      eq(rides.status, "driver_arriving"),
      eq(rides.status, "in_progress")
    ))
    .orderBy(desc(rides.requestedAt));
}

export async function getRidesByRiderId(riderId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(rides)
    .where(eq(rides.riderId, riderId))
    .orderBy(desc(rides.requestedAt));
}

export async function getRidesByDriverId(driverId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(rides)
    .where(eq(rides.driverId, driverId))
    .orderBy(desc(rides.requestedAt));
}

export async function getAllRides() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(rides).orderBy(desc(rides.requestedAt));
}

// ============ PAYMENT OPERATIONS ============

export async function createPayment(payment: InsertPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(payments).values(payment);
  return result;
}

export async function updatePaymentStatus(
  paymentId: number, 
  status: "pending" | "completed" | "failed" | "refunded"
) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(payments).set({ status }).where(eq(payments.id, paymentId));
}

export async function getPaymentByRideId(rideId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(payments).where(eq(payments.rideId, rideId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPaymentsByDriverId(driverId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(payments)
    .where(and(
      eq(payments.driverId, driverId),
      eq(payments.status, "completed")
    ))
    .orderBy(desc(payments.createdAt));
}

// ============ RATING OPERATIONS ============

export async function createRating(rating: InsertRating) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(ratings).values(rating);
  return result;
}

export async function updateRating(rideId: number, updates: Partial<InsertRating>) {
  const db = await getDb();
  if (!db) return;
  
  const existing = await db.select().from(ratings).where(eq(ratings.rideId, rideId)).limit(1);
  
  if (existing.length > 0) {
    await db.update(ratings).set(updates).where(eq(ratings.rideId, rideId));
  } else {
    await db.insert(ratings).values({ rideId, ...updates });
  }
}

export async function getRatingByRideId(rideId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(ratings).where(eq(ratings.rideId, rideId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ LOCATION TRACKING ============

export async function addLocationTracking(tracking: InsertLocationTracking) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(locationTracking).values(tracking);
  return result;
}

export async function getLocationTrackingByRideId(rideId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(locationTracking)
    .where(eq(locationTracking.rideId, rideId))
    .orderBy(desc(locationTracking.timestamp));
}

// ============ RIDE-SHARING OPERATIONS ============

export async function addPassengerToRide(passenger: InsertRidePassenger) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(ridePassengers).values(passenger);
  return result;
}

export async function getPassengersByRideId(rideId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(ridePassengers)
    .where(eq(ridePassengers.rideId, rideId))
    .orderBy(desc(ridePassengers.createdAt));
}

export async function updatePassengerStatus(
  passengerId: number,
  status: "waiting" | "picked_up" | "dropped_off"
) {
  const db = await getDb();
  if (!db) return;
  
  const updates: any = { status };
  
  if (status === "picked_up") {
    updates.pickedUpAt = new Date();
  } else if (status === "dropped_off") {
    updates.droppedOffAt = new Date();
  }
  
  await db.update(ridePassengers).set(updates).where(eq(ridePassengers.id, passengerId));
}

export async function updatePassengerPaymentStatus(
  passengerId: number,
  paymentStatus: "pending" | "completed" | "failed"
) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(ridePassengers).set({ paymentStatus }).where(eq(ridePassengers.id, passengerId));
}

export async function findCompatibleSharedRides(
  pickupLat: number,
  pickupLng: number,
  dropoffLat: number,
  dropoffLng: number,
  vehicleType: string,
  maxDetourKm: number = 2
) {
  const db = await getDb();
  if (!db) return [];
  
  // Find rides that are:
  // 1. Shared rides with available capacity
  // 2. Same vehicle type
  // 3. Status is searching or accepted (not started yet)
  // 4. Within reasonable distance from pickup/dropoff (simple bounding box)
  
  const latRange = maxDetourKm / 111; // Rough conversion: 1 degree ≈ 111km
  const lngRange = maxDetourKm / 111;
  
  const compatibleRides = await db.select().from(rides)
    .where(
      and(
        eq(rides.isShared, true),
        eq(rides.vehicleType, vehicleType as any),
        or(
          eq(rides.status, "searching"),
          eq(rides.status, "accepted")
        ),
        sql`${rides.currentPassengers} < ${rides.maxPassengers}`
      )
    )
    .orderBy(desc(rides.requestedAt));
  
  // Filter by distance (simple bounding box check)
  return compatibleRides.filter(ride => {
    const ridePickupLat = parseFloat(ride.pickupLatitude);
    const ridePickupLng = parseFloat(ride.pickupLongitude);
    const rideDropoffLat = parseFloat(ride.dropoffLatitude);
    const rideDropoffLng = parseFloat(ride.dropoffLongitude);
    
    const pickupInRange = 
      Math.abs(ridePickupLat - pickupLat) <= latRange &&
      Math.abs(ridePickupLng - pickupLng) <= lngRange;
    
    const dropoffInRange = 
      Math.abs(rideDropoffLat - dropoffLat) <= latRange &&
      Math.abs(rideDropoffLng - dropoffLng) <= lngRange;
    
    return pickupInRange && dropoffInRange;
  });
}

export async function incrementRidePassengerCount(rideId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(rides)
    .set({ currentPassengers: sql`${rides.currentPassengers} + 1` })
    .where(eq(rides.id, rideId));
}

// ============ LOCATION MANAGEMENT ============

export async function getSavedLocationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(savedLocations)
    .where(eq(savedLocations.userId, userId))
    .orderBy(desc(savedLocations.createdAt));
}

export async function addSavedLocation(location: InsertSavedLocation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(savedLocations).values(location);
  return result;
}

export async function deleteSavedLocation(locationId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(savedLocations)
    .where(
      and(
        eq(savedLocations.id, locationId),
        eq(savedLocations.userId, userId)
      )
    );
}

export async function getRecentLocationsByUserId(userId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(recentLocations)
    .where(eq(recentLocations.userId, userId))
    .orderBy(desc(recentLocations.usedAt))
    .limit(limit);
}

export async function addRecentLocation(location: InsertRecentLocation) {
  const db = await getDb();
  if (!db) return;
  
  // Add new recent location
  await db.insert(recentLocations).values(location);
  
  // Keep only last 20 recent locations per user
  const allRecent = await db.select().from(recentLocations)
    .where(eq(recentLocations.userId, location.userId))
    .orderBy(desc(recentLocations.usedAt));
  
  if (allRecent.length > 20) {
    const toDelete = allRecent.slice(20).map(r => r.id);
    await db.delete(recentLocations)
      .where(sql`${recentLocations.id} IN (${toDelete.join(',')})`);
  }
}
