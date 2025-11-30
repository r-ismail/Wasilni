import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createRiderContext(userId: number): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `rider-test-${userId}`,
    email: `rider${userId}@example.com`,
    name: `Test Rider ${userId}`,
    phone: null,
    loginMethod: "manus",
    role: "rider",
    profilePhoto: null,
    licenseNumber: null,
    driverStatus: "offline",
    currentLatitude: null,
    currentLongitude: null,
    isVerified: false,
    totalRides: 0,
    averageRating: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createDriverContext(userId: number): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `driver-test-${userId}`,
    email: `driver${userId}@example.com`,
    name: `Test Driver ${userId}`,
    phone: null,
    loginMethod: "manus",
    role: "driver",
    profilePhoto: null,
    licenseNumber: "DL123456",
    driverStatus: "available",
    currentLatitude: "40.7128",
    currentLongitude: "-74.0060",
    isVerified: true,
    totalRides: 10,
    averageRating: 450,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Ride Flow Constraints", () => {
  let testRiderId: number;
  let testDriverId: number;
  let testVehicleId: number;

  beforeAll(async () => {
    // Create test rider
    await db.upsertUser({
      openId: "rider-flow-test",
      name: "Flow Test Rider",
      email: "rider-flow@test.com",
      role: "rider",
    });
    const rider = await db.getUserByOpenId("rider-flow-test");
    if (!rider) throw new Error("Failed to create test rider");
    testRiderId = rider.id;

    // Create test driver
    await db.upsertUser({
      openId: "driver-flow-test",
      name: "Flow Test Driver",
      email: "driver-flow@test.com",
      role: "driver",
      licenseNumber: "DL-FLOW-123",
      driverStatus: "available",
    });
    const driver = await db.getUserByOpenId("driver-flow-test");
    if (!driver) throw new Error("Failed to create test driver");
    testDriverId = driver.id;

    // Create test vehicle
    testVehicleId = await db.createVehicle({
      driverId: testDriverId,
      make: "Toyota",
      model: "Camry",
      year: 2023,
      color: "Black",
      licensePlate: "FLOW-123",
      vehicleType: "economy",
      capacity: 4,
    });
  });

  it("should prevent rider from creating multiple active rides", async () => {
    const caller = appRouter.createCaller(createRiderContext(testRiderId));

    // Create first ride
    const ride1 = await caller.rider.requestRide({
      pickupAddress: "123 Main St",
      pickupLatitude: "40.7128",
      pickupLongitude: "-74.0060",
      dropoffAddress: "456 Park Ave",
      dropoffLatitude: "40.7580",
      dropoffLongitude: "-73.9855",
      vehicleType: "economy",
      estimatedFare: 1500,
    });

    expect(ride1.success).toBe(true);

    // Try to create second ride - should fail
    await expect(
      caller.rider.requestRide({
        pickupAddress: "789 Broadway",
        pickupLatitude: "40.7489",
        pickupLongitude: "-73.9680",
        dropoffAddress: "321 5th Ave",
        dropoffLatitude: "40.7614",
        dropoffLongitude: "-73.9776",
        vehicleType: "comfort",
        estimatedFare: 2000,
      })
    ).rejects.toThrow(/already have an active ride/i);
  });

  it("should allow rider to create new ride after completing previous ride", async () => {
    const caller = appRouter.createCaller(createRiderContext(testRiderId));

    // Get the active ride
    const rides = await db.getRidesByRiderId(testRiderId);
    const activeRide = rides.find(r => r.status === "searching");
    
    if (activeRide) {
      // Complete the ride
      await db.updateRideStatus(activeRide.id, "completed");
    }

    // Now should be able to create new ride
    const newRide = await caller.rider.requestRide({
      pickupAddress: "New Location",
      pickupLatitude: "40.7500",
      pickupLongitude: "-73.9700",
      dropoffAddress: "New Destination",
      dropoffLatitude: "40.7600",
      dropoffLongitude: "-73.9800",
      vehicleType: "economy",
      estimatedFare: 1800,
    });

    expect(newRide.success).toBe(true);
  });

  it("should prevent driver from accepting multiple rides", async () => {
    const caller = appRouter.createCaller(createDriverContext(testDriverId));

    // Clean up any existing active rides for this driver
    const existingRides = await db.getRidesByDriverId(testDriverId);
    for (const ride of existingRides) {
      if (ride.status !== "completed" && ride.status !== "cancelled") {
        await db.updateRideStatus(ride.id, "completed");
      }
    }
    await db.updateDriverStatus(testDriverId, "available");

    // Create test rider for this scenario
    await db.upsertUser({
      openId: "rider-multi-accept-test",
      name: "Multi Accept Rider",
      email: "multi-accept@test.com",
      role: "rider",
    });
    const multiRider = await db.getUserByOpenId("rider-multi-accept-test");
    if (!multiRider) throw new Error("Failed to create multi accept rider");

    // Create additional test rides if needed
    const riderCaller = appRouter.createCaller(createRiderContext(multiRider.id));
    await riderCaller.rider.requestRide({
      pickupAddress: "Test Address 1",
      pickupLatitude: "40.7128",
      pickupLongitude: "-74.0060",
      dropoffAddress: "Test Address 2",
      dropoffLatitude: "40.7580",
      dropoffLongitude: "-73.9855",
      vehicleType: "economy",
      estimatedFare: 1500,
    });

    const pendingRides = await db.getPendingRides();
    expect(pendingRides.length).toBeGreaterThanOrEqual(1);

    // Accept first ride
    await caller.driver.acceptRide({
      rideId: pendingRides[0].id,
      vehicleId: testVehicleId,
    });

    // Try to accept second ride - should fail
    if (pendingRides.length > 1) {
      await expect(
        caller.driver.acceptRide({
          rideId: pendingRides[1].id,
          vehicleId: testVehicleId,
        })
      ).rejects.toThrow(/already have an active ride/i);
    }
  });

  it("should allow driver to accept new ride after completing previous ride", async () => {
    const caller = appRouter.createCaller(createDriverContext(testDriverId));

    // Get the active ride
    const rides = await db.getRidesByDriverId(testDriverId);
    const activeRide = rides.find(r => 
      r.status === "accepted" || 
      r.status === "in_progress"
    );
    
    if (activeRide) {
      // Complete the ride
      await db.updateRideStatus(activeRide.id, "completed");
      await db.updateDriverStatus(testDriverId, "available");
    }

    // Create test rider for this scenario
    await db.upsertUser({
      openId: "rider-new-accept-test",
      name: "New Accept Rider",
      email: "new-accept@test.com",
      role: "rider",
    });
    const newRider = await db.getUserByOpenId("rider-new-accept-test");
    if (!newRider) throw new Error("Failed to create new accept rider");

    // Create a new pending ride
    const riderCaller = appRouter.createCaller(createRiderContext(newRider.id));
    await riderCaller.rider.requestRide({
      pickupAddress: "New Test Address",
      pickupLatitude: "40.7200",
      pickupLongitude: "-74.0100",
      dropoffAddress: "New Test Destination",
      dropoffLatitude: "40.7600",
      dropoffLongitude: "-73.9900",
      vehicleType: "economy",
      estimatedFare: 1600,
    });

    const pendingRides = await db.getPendingRides();
    expect(pendingRides.length).toBeGreaterThanOrEqual(1);

    // Now should be able to accept new ride
    const result = await caller.driver.acceptRide({
      rideId: pendingRides[0].id,
      vehicleId: testVehicleId,
    });

    expect(result.success).toBe(true);
  });

  it("should return proper error message when rider has active ride", async () => {
    const caller = appRouter.createCaller(createRiderContext(testRiderId));

    await expect(
      caller.rider.requestRide({
        pickupAddress: "Should Fail",
        pickupLatitude: "40.7128",
        pickupLongitude: "-74.0060",
        dropoffAddress: "Should Fail",
        dropoffLatitude: "40.7580",
        dropoffLongitude: "-73.9855",
        vehicleType: "economy",
        estimatedFare: 1500,
      })
    ).rejects.toThrow(/already have an active ride.*complete or cancel/i);
  });

  it("should return proper error message when driver has active ride", async () => {
    const caller = appRouter.createCaller(createDriverContext(testDriverId));

    // Create test rider for this scenario
    await db.upsertUser({
      openId: "rider-error-msg-test",
      name: "Error Msg Rider",
      email: "error-msg@test.com",
      role: "rider",
    });
    const errorRider = await db.getUserByOpenId("rider-error-msg-test");
    if (!errorRider) throw new Error("Failed to create error msg rider");

    // Create a pending ride
    const riderCaller = appRouter.createCaller(createRiderContext(errorRider.id));
    await riderCaller.rider.requestRide({
      pickupAddress: "Test",
      pickupLatitude: "40.7128",
      pickupLongitude: "-74.0060",
      dropoffAddress: "Test",
      dropoffLatitude: "40.7580",
      dropoffLongitude: "-73.9855",
      vehicleType: "economy",
      estimatedFare: 1500,
    });

    const pendingRides = await db.getPendingRides();

    await expect(
      caller.driver.acceptRide({
        rideId: pendingRides[0].id,
        vehicleId: testVehicleId,
      })
    ).rejects.toThrow(/already have an active ride.*complete it before accepting/i);
  });
});
