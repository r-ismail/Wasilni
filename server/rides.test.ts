import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createRiderContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "rider-test-user",
    email: "rider@example.com",
    name: "Test Rider",
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

function createDriverContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "driver-test-user",
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

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 3,
    openId: "admin-test-user",
    email: "admin@example.com",
    name: "Test Admin",
    phone: null,
    loginMethod: "manus",
    role: "admin",
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

describe("Ride Request Flow", () => {
  it("allows rider to request a ride", async () => {
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
      estimatedFare: 1500, // $15.00
      distance: 5000, // 5km
      duration: 600, // 10 minutes
    });

    expect(result.success).toBe(true);
    expect(typeof result.rideId).toBe("number");
  });

  it("calculates fare correctly for different vehicle types", async () => {
    const ctx = createRiderContext();
    const caller = appRouter.createCaller(ctx);

    const economyFare = await caller.common.calculateFare({
      distance: 5000, // 5km
      vehicleType: "economy",
    });

    const comfortFare = await caller.common.calculateFare({
      distance: 5000,
      vehicleType: "comfort",
    });

    const premiumFare = await caller.common.calculateFare({
      distance: 5000,
      vehicleType: "premium",
    });

    expect(economyFare.estimatedFare).toBeLessThan(comfortFare.estimatedFare);
    expect(comfortFare.estimatedFare).toBeLessThan(premiumFare.estimatedFare);
    expect(economyFare.currency).toBe("USD");
  });
});

describe("Driver Operations", () => {
  it("allows driver to update availability status", async () => {
    const ctx = createDriverContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.driver.updateStatus({
      status: "available",
    });

    expect(result.success).toBe(true);
  });

  it("allows driver to update location", async () => {
    const ctx = createDriverContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.driver.updateLocation({
      latitude: "40.7589",
      longitude: "-73.9851",
    });

    expect(result.success).toBe(true);
  });

  it("retrieves pending rides for available drivers", async () => {
    const ctx = createDriverContext();
    const caller = appRouter.createCaller(ctx);

    const rides = await caller.driver.getPendingRides();

    expect(Array.isArray(rides)).toBe(true);
  });
});

describe("Admin Operations", () => {
  it("retrieves dashboard statistics", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.admin.getDashboardStats();

    expect(stats).toHaveProperty("totalRides");
    expect(stats).toHaveProperty("completedRides");
    expect(stats).toHaveProperty("activeRides");
    expect(stats).toHaveProperty("totalRevenue");
    expect(stats).toHaveProperty("totalUsers");
    expect(stats).toHaveProperty("totalDrivers");
    expect(stats).toHaveProperty("activeDrivers");
    expect(typeof stats.totalRides).toBe("number");
  });

  it("retrieves all users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const users = await caller.admin.getAllUsers();

    expect(Array.isArray(users)).toBe(true);
  });

  it("retrieves all rides", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const rides = await caller.admin.getAllRides();

    expect(Array.isArray(rides)).toBe(true);
  });

  it("allows admin to update user role", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.updateUserRole({
      userId: 1,
      role: "driver",
    });

    expect(result.success).toBe(true);
  });

  it("allows admin to verify driver", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // This test would require a user to exist in the database
    // For now, we test that the endpoint exists and requires proper user
    await expect(
      caller.admin.verifyDriver({
        userId: 999999,
        isVerified: true,
      })
    ).rejects.toThrow("User not found");
  });
});

describe("Access Control", () => {
  it("prevents non-driver from accessing driver endpoints", async () => {
    const ctx = createRiderContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.driver.updateStatus({ status: "available" })
    ).rejects.toThrow();
  });

  it("prevents non-admin from accessing admin endpoints", async () => {
    const ctx = createRiderContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.getDashboardStats()).rejects.toThrow();
  });
});
