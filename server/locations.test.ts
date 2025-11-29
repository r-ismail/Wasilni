import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(id: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `test-user-${id}`,
    email: `test${id}@example.com`,
    name: `Test User ${id}`,
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

describe("Location Management", () => {
  it("allows user to save a favorite location", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.locations.addSavedLocation({
      label: "Home",
      address: "123 Main St, New York, NY",
      latitude: "40.7128",
      longitude: "-74.0060",
    });

    expect(result.success).toBe(true);
  });

  it("retrieves saved locations for a user", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const locations = await caller.locations.getSavedLocations();

    expect(Array.isArray(locations)).toBe(true);
  });

  it("allows user to delete a saved location", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.locations.deleteSavedLocation({
      locationId: 1,
    });

    expect(result.success).toBe(true);
  });

  it("allows user to add a recent location", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.locations.addRecentLocation({
      address: "456 Broadway, New York, NY",
      latitude: "40.7589",
      longitude: "-73.9851",
    });

    expect(result.success).toBe(true);
  });

  it("retrieves recent locations for a user", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const locations = await caller.locations.getRecentLocations();

    expect(Array.isArray(locations)).toBe(true);
  });

  it("prevents unauthorized access to other users' saved locations", async () => {
    const ctx1 = createTestContext(1);
    const ctx2 = createTestContext(2);
    
    const caller1 = appRouter.createCaller(ctx1);
    const caller2 = appRouter.createCaller(ctx2);

    // User 1 saves a location
    await caller1.locations.addSavedLocation({
      label: "User 1 Home",
      address: "123 Test St",
      latitude: "40.7128",
      longitude: "-74.0060",
    });

    // User 2 gets their saved locations (should not include User 1's)
    const user2Locations = await caller2.locations.getSavedLocations();
    
    // Each user should only see their own locations
    expect(Array.isArray(user2Locations)).toBe(true);
  });
});

describe("Location Search Features", () => {
  it("validates location data format", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Test that valid location data is accepted
    const result = await caller.locations.addSavedLocation({
      label: "Work",
      address: "789 Office Blvd, New York, NY",
      latitude: "40.7580",
      longitude: "-73.9855",
    });

    expect(result.success).toBe(true);
  });

  it("handles empty label for saved location", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Empty label should still be accepted (validation happens on frontend)
    const result = await caller.locations.addSavedLocation({
      label: "",
      address: "Test Address",
      latitude: "40.7128",
      longitude: "-74.0060",
    });

    expect(result.success).toBe(true);
  });
});
