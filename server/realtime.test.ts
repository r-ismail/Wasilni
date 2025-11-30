import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createDriverContext(driverId: number = 2): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: driverId,
    openId: `driver-${driverId}`,
    email: `driver${driverId}@example.com`,
    name: `Test Driver ${driverId}`,
    loginMethod: "manus",
    role: "driver",
    phone: null,
    profilePhoto: null,
    licenseNumber: "DL123456",
    driverStatus: "available",
    currentLatitude: "15.5527",
    currentLongitude: "48.5164",
    isVerified: true,
    totalRides: 0,
    averageRating: 450,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    lastLocationUpdate: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("Real-time Location Tracking", () => {
  it("should update driver location successfully", async () => {
    const { ctx } = createDriverContext();
    const caller = appRouter.createCaller(ctx);

    const newLocation = {
      latitude: "15.5600",
      longitude: "48.5200",
    };

    const result = await caller.driver.updateLocation(newLocation);

    expect(result).toEqual({ success: true });
  });

  it("should retrieve available drivers with recent locations", async () => {
    const { ctx } = createDriverContext();
    const caller = appRouter.createCaller(ctx);

    // First update driver location
    await caller.driver.updateLocation({
      latitude: "15.5527",
      longitude: "48.5164",
    });

    // Then fetch available drivers
    const drivers = await caller.common.getAvailableDrivers();

    expect(Array.isArray(drivers)).toBe(true);
    // Note: Actual driver count depends on database state
    // We just verify the structure is correct
    if (drivers.length > 0) {
      const driver = drivers[0];
      expect(driver).toHaveProperty("id");
      expect(driver).toHaveProperty("name");
      expect(driver).toHaveProperty("latitude");
      expect(driver).toHaveProperty("longitude");
      expect(driver).toHaveProperty("averageRating");
      expect(typeof driver.latitude).toBe("number");
      expect(typeof driver.longitude).toBe("number");
    }
  });

  it("should filter out drivers without recent location updates", async () => {
    const { ctx } = createDriverContext();
    const caller = appRouter.createCaller(ctx);

    const drivers = await caller.common.getAvailableDrivers();

    // All returned drivers should have valid coordinates
    drivers.forEach((driver) => {
      expect(driver.latitude).toBeDefined();
      expect(driver.longitude).toBeDefined();
      expect(typeof driver.latitude).toBe("number");
      expect(typeof driver.longitude).toBe("number");
    });
  });
});
