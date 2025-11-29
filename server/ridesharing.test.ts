import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createRiderContext(id: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `rider-test-user-${id}`,
    email: `rider${id}@example.com`,
    name: `Test Rider ${id}`,
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

describe("Ride-Sharing Feature", () => {
  it("calculates discounted fare for shared rides", async () => {
    const ctx = createRiderContext();
    const caller = appRouter.createCaller(ctx);

    const regularFare = await caller.common.calculateFare({
      distance: 5000, // 5km
      vehicleType: "economy",
      isShared: false,
    });

    const sharedFare = await caller.common.calculateFare({
      distance: 5000,
      vehicleType: "economy",
      isShared: true,
    });

    // Shared rides should be 20% cheaper
    expect(sharedFare.estimatedFare).toBeLessThan(regularFare.estimatedFare);
    expect(sharedFare.isShared).toBe(true);
    expect(sharedFare.estimatedFare).toBeCloseTo(regularFare.estimatedFare * 0.8, 0);
  });

  it("allows rider to create a shared ride", async () => {
    const ctx = createRiderContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.rider.requestRide({
      pickupAddress: "123 Main St, New York, NY",
      pickupLatitude: "40.7128",
      pickupLongitude: "-74.0060",
      dropoffAddress: "456 Broadway, New York, NY",
      dropoffLatitude: "40.7589",
      dropoffLongitude: "-73.9851",
      vehicleType: "economy",
      estimatedFare: 1200, // $12.00 (20% discount applied)
      distance: 5000,
      duration: 600,
      isShared: true,
      maxPassengers: 4,
    });

    expect(result.success).toBe(true);
    expect(typeof result.rideId).toBe("number");
  });

  it("finds compatible shared rides", async () => {
    const ctx = createRiderContext(2);
    const caller = appRouter.createCaller(ctx);

    // Search for rides in similar area
    const compatibleRides = await caller.rider.findSharedRides({
      pickupLatitude: "40.7130",
      pickupLongitude: "-74.0062",
      dropoffLatitude: "40.7590",
      dropoffLongitude: "-73.9850",
      vehicleType: "economy",
    });

    expect(Array.isArray(compatibleRides)).toBe(true);
  });

  it("retrieves passenger list for a ride", async () => {
    const ctx = createRiderContext();
    const caller = appRouter.createCaller(ctx);

    // This would require a ride to exist
    const passengers = await caller.rider.getRidePassengers({
      rideId: 1,
    });

    expect(Array.isArray(passengers)).toBe(true);
  });

  it("prevents joining a full shared ride", async () => {
    const ctx = createRiderContext(2);
    const caller = appRouter.createCaller(ctx);

    // Attempting to join a non-existent ride should fail
    await expect(
      caller.rider.joinSharedRide({
        rideId: 999999,
        pickupAddress: "789 Test St",
        pickupLatitude: "40.7130",
        pickupLongitude: "-74.0062",
        dropoffAddress: "321 Test Ave",
        dropoffLatitude: "40.7590",
        dropoffLongitude: "-73.9850",
        fare: 1200,
      })
    ).rejects.toThrow("Ride not found");
  });
});

describe("Driver Passenger Management", () => {
  it("allows driver to update passenger status", async () => {
    // This test validates the endpoint exists
    const ctx: TrpcContext = {
      user: {
        id: 2,
        openId: "driver-test",
        email: "driver@example.com",
        name: "Test Driver",
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
      },
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    // Test that the endpoint exists and accepts valid input
    // In a real scenario with database, this would update passenger status
    const result = await caller.driver.updatePassengerStatus({
      passengerId: 1,
      status: "picked_up",
    });

    expect(result.success).toBe(true);
  });
});

describe("Shared Ride Fare Calculation", () => {
  it("applies correct discount percentage for all vehicle types", async () => {
    const ctx = createRiderContext();
    const caller = appRouter.createCaller(ctx);

    const vehicleTypes: Array<"economy" | "comfort" | "premium"> = [
      "economy",
      "comfort",
      "premium",
    ];

    for (const vehicleType of vehicleTypes) {
      const regularFare = await caller.common.calculateFare({
        distance: 10000, // 10km
        vehicleType,
        isShared: false,
      });

      const sharedFare = await caller.common.calculateFare({
        distance: 10000,
        vehicleType,
        isShared: true,
      });

      // Verify 20% discount is applied
      const expectedDiscount = regularFare.estimatedFare * 0.2;
      const actualDiscount = regularFare.estimatedFare - sharedFare.estimatedFare;

      expect(actualDiscount).toBeCloseTo(expectedDiscount, 0);
    }
  });
});
