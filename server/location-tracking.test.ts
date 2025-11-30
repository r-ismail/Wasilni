import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("Real-Time Driver Location Tracking", () => {
  let testDriverId: number;
  let testRiderId: number;
  let testRideId: number;

  beforeAll(async () => {
    // Create test driver
    await db.upsertUser({
      openId: "driver-location-test",
      name: "Location Test Driver",
      email: "location-driver@test.com",
      role: "driver",
      licenseNumber: "DL-LOC-123",
      driverStatus: "available",
    });
    const driver = await db.getUserByOpenId("driver-location-test");
    if (!driver) throw new Error("Failed to create test driver");
    testDriverId = driver.id;

    // Create test rider
    await db.upsertUser({
      openId: "rider-location-test",
      name: "Location Test Rider",
      email: "location-rider@test.com",
      role: "rider",
    });
    const rider = await db.getUserByOpenId("rider-location-test");
    if (!rider) throw new Error("Failed to create test rider");
    testRiderId = rider.id;

    // Create test ride
    testRideId = await db.createRide({
      riderId: testRiderId,
      pickupAddress: "Test Pickup",
      pickupLatitude: "40.7128",
      pickupLongitude: "-74.0060",
      dropoffAddress: "Test Dropoff",
      dropoffLatitude: "40.7580",
      dropoffLongitude: "-73.9855",
      vehicleType: "economy",
      estimatedFare: 1500,
      distance: 5000,
      duration: 600,
      status: "accepted",
    });
  });

  it("should update driver location in database", async () => {
    // Update driver location
    await db.updateDriverLocation(testDriverId, "40.7200", "-74.0100");

    // Verify location was updated
    const driver = await db.getUserById(testDriverId);
    expect(driver).toBeDefined();
    expect(driver?.currentLatitude).toBe("40.7200");
    expect(driver?.currentLongitude).toBe("-74.0100");
    expect(driver?.lastLocationUpdate).toBeDefined();
  });

  it("should track location updates over time", async () => {
    // Simulate multiple location updates
    const locations = [
      { lat: "40.7200", lng: "-74.0100" },
      { lat: "40.7250", lng: "-74.0050" },
      { lat: "40.7300", lng: "-74.0000" },
    ];

    for (const loc of locations) {
      await db.updateDriverLocation(testDriverId, loc.lat, loc.lng);
      
      const driver = await db.getUserById(testDriverId);
      expect(driver?.currentLatitude).toBe(loc.lat);
      expect(driver?.currentLongitude).toBe(loc.lng);
    }
  });

  it("should retrieve driver location for active ride", async () => {
    // Update driver location
    await db.updateDriverLocation(testDriverId, "40.7400", "-73.9900");

    // Get ride with driver info
    const ride = await db.getRideById(testRideId);
    expect(ride).toBeDefined();

    // Get driver location
    const driver = await db.getUserById(testDriverId);
    expect(driver?.currentLatitude).toBe("40.7400");
    expect(driver?.currentLongitude).toBe("-73.9900");
  });

  it("should calculate distance between two coordinates", () => {
    // Helper function to calculate distance (Haversine formula)
    const calculateDistance = (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number
    ): number => {
      const R = 6371e3; // Earth radius in meters
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lon2 - lon1) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c; // Distance in meters
    };

    // Test distance calculation
    const distance = calculateDistance(40.7128, -74.006, 40.758, -73.9855);
    
    // Distance between these points should be approximately 5.8 km
    expect(distance).toBeGreaterThan(5000);
    expect(distance).toBeLessThan(7000);
  });

  it("should store coordinates as strings", async () => {
    // Database stores coordinates as strings, so any string value is valid
    await db.updateDriverLocation(testDriverId, "40.7000", "-74.0000");
    
    const driver = await db.getUserById(testDriverId);
    expect(typeof driver?.currentLatitude).toBe("string");
    expect(typeof driver?.currentLongitude).toBe("string");
  });

  it("should update lastLocationUpdate timestamp", async () => {
    const beforeUpdate = new Date();
    
    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await db.updateDriverLocation(testDriverId, "40.7500", "-73.9800");
    
    const driver = await db.getUserById(testDriverId);
    expect(driver?.lastLocationUpdate).toBeDefined();
    
    if (driver?.lastLocationUpdate) {
      const updateTime = new Date(driver.lastLocationUpdate);
      expect(updateTime.getTime()).toBeGreaterThan(beforeUpdate.getTime());
    }
  });

  it("should maintain location accuracy", async () => {
    // Test with high precision coordinates
    const preciseLat = "40.712776";
    const preciseLng = "-74.005974";
    
    await db.updateDriverLocation(testDriverId, preciseLat, preciseLng);
    
    const driver = await db.getUserById(testDriverId);
    expect(driver?.currentLatitude).toBe(preciseLat);
    expect(driver?.currentLongitude).toBe(preciseLng);
  });

  it("should support multiple drivers tracking simultaneously", async () => {
    // Create second driver
    await db.upsertUser({
      openId: "driver-location-test-2",
      name: "Location Test Driver 2",
      email: "location-driver-2@test.com",
      role: "driver",
      licenseNumber: "DL-LOC-456",
      driverStatus: "available",
    });
    const driver2 = await db.getUserByOpenId("driver-location-test-2");
    if (!driver2) throw new Error("Failed to create second test driver");

    // Update both drivers' locations
    await db.updateDriverLocation(testDriverId, "40.7100", "-74.0100");
    await db.updateDriverLocation(driver2.id, "40.7600", "-73.9700");

    // Verify both locations are correct
    const d1 = await db.getUserById(testDriverId);
    const d2 = await db.getUserById(driver2.id);

    expect(d1?.currentLatitude).toBe("40.7100");
    expect(d1?.currentLongitude).toBe("-74.0100");
    expect(d2?.currentLatitude).toBe("40.7600");
    expect(d2?.currentLongitude).toBe("-73.9700");
  });
});
