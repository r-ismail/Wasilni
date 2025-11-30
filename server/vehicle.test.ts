import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";
import { getDb } from "./db";
import { vehicles } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Vehicle Management", () => {
  let testDriverId: number;
  let testVehicleId: number;

  beforeAll(async () => {
    // Create a test driver user
    await db.upsertUser({
      openId: "test-driver-vehicle-mgmt",
      name: "Test Driver",
      email: "driver-vehicle@test.com",
      role: "driver",
    });
    
    // Get the user ID
    const user = await db.getUserByOpenId("test-driver-vehicle-mgmt");
    if (!user) throw new Error("Failed to create test driver");
    testDriverId = user.id;
  });

  it("should create a new vehicle for a driver", async () => {
    const vehicleData = {
      driverId: testDriverId,
      make: "Toyota",
      model: "Camry",
      year: 2022,
      color: "White",
      licensePlate: "ABC-1234",
      vehicleType: "economy" as const,
      capacity: 4,
    };

    testVehicleId = await db.createVehicle(vehicleData);
    expect(testVehicleId).toBeGreaterThan(0);

    // Verify vehicle was created
    const vehicle = await db.getVehicleById(testVehicleId);
    expect(vehicle).toBeDefined();
    expect(vehicle?.make).toBe("Toyota");
    expect(vehicle?.model).toBe("Camry");
    expect(vehicle?.licensePlate).toBe("ABC-1234");
    expect(vehicle?.vehicleType).toBe("economy");
  });

  it("should retrieve all vehicles for a specific driver", async () => {
    // Create another vehicle for the same driver
    await db.createVehicle({
      driverId: testDriverId,
      make: "Honda",
      model: "Accord",
      year: 2023,
      color: "Black",
      licensePlate: "XYZ-5678",
      vehicleType: "comfort" as const,
      capacity: 4,
    });

    const driverVehicles = await db.getVehiclesByDriverId(testDriverId);
    expect(driverVehicles.length).toBeGreaterThanOrEqual(2);
    
    const makes = driverVehicles.map(v => v.make);
    expect(makes).toContain("Toyota");
    expect(makes).toContain("Honda");
  });

  it("should retrieve a vehicle by ID", async () => {
    const vehicle = await db.getVehicleById(testVehicleId);
    expect(vehicle).toBeDefined();
    expect(vehicle?.id).toBe(testVehicleId);
    expect(vehicle?.driverId).toBe(testDriverId);
  });

  it("should update vehicle information", async () => {
    await db.updateVehicle(testVehicleId, {
      color: "Silver",
      year: 2023,
    });

    const updatedVehicle = await db.getVehicleById(testVehicleId);
    expect(updatedVehicle?.color).toBe("Silver");
    expect(updatedVehicle?.year).toBe(2023);
    // Other fields should remain unchanged
    expect(updatedVehicle?.make).toBe("Toyota");
    expect(updatedVehicle?.model).toBe("Camry");
  });

  it("should update vehicle type", async () => {
    await db.updateVehicle(testVehicleId, {
      vehicleType: "premium" as const,
    });

    const updatedVehicle = await db.getVehicleById(testVehicleId);
    expect(updatedVehicle?.vehicleType).toBe("premium");
  });

  it("should update vehicle capacity", async () => {
    await db.updateVehicle(testVehicleId, {
      capacity: 5,
    });

    const updatedVehicle = await db.getVehicleById(testVehicleId);
    expect(updatedVehicle?.capacity).toBe(5);
  });

  it("should delete a vehicle", async () => {
    const vehicleToDelete = await db.createVehicle({
      driverId: testDriverId,
      make: "Ford",
      model: "Focus",
      year: 2021,
      color: "Blue",
      licensePlate: "DEL-9999",
      vehicleType: "economy" as const,
      capacity: 4,
    });

    await db.deleteVehicle(vehicleToDelete);

    const deletedVehicle = await db.getVehicleById(vehicleToDelete);
    expect(deletedVehicle).toBeUndefined();
  });

  it("should handle different vehicle types correctly", async () => {
    const economyVehicle = await db.createVehicle({
      driverId: testDriverId,
      make: "Nissan",
      model: "Versa",
      year: 2022,
      color: "Red",
      licensePlate: "ECO-1111",
      vehicleType: "economy" as const,
      capacity: 4,
    });

    const comfortVehicle = await db.createVehicle({
      driverId: testDriverId,
      make: "Mazda",
      model: "6",
      year: 2023,
      color: "Gray",
      licensePlate: "COM-2222",
      vehicleType: "comfort" as const,
      capacity: 4,
    });

    const premiumVehicle = await db.createVehicle({
      driverId: testDriverId,
      make: "BMW",
      model: "5 Series",
      year: 2024,
      color: "Black",
      licensePlate: "PRE-3333",
      vehicleType: "premium" as const,
      capacity: 4,
    });

    const economy = await db.getVehicleById(economyVehicle);
    const comfort = await db.getVehicleById(comfortVehicle);
    const premium = await db.getVehicleById(premiumVehicle);

    expect(economy?.vehicleType).toBe("economy");
    expect(comfort?.vehicleType).toBe("comfort");
    expect(premium?.vehicleType).toBe("premium");
  });

  it("should handle vehicles with different capacities", async () => {
    const smallVehicle = await db.createVehicle({
      driverId: testDriverId,
      make: "Smart",
      model: "ForTwo",
      year: 2022,
      color: "Yellow",
      licensePlate: "SML-1234",
      vehicleType: "economy" as const,
      capacity: 2,
    });

    const largeVehicle = await db.createVehicle({
      driverId: testDriverId,
      make: "Chevrolet",
      model: "Suburban",
      year: 2023,
      color: "White",
      licensePlate: "LRG-5678",
      vehicleType: "comfort" as const,
      capacity: 7,
    });

    const small = await db.getVehicleById(smallVehicle);
    const large = await db.getVehicleById(largeVehicle);

    expect(small?.capacity).toBe(2);
    expect(large?.capacity).toBe(7);
  });

  it("should isolate vehicles between different drivers", async () => {
    // Create another driver
    await db.upsertUser({
      openId: "test-driver-2-vehicle",
      name: "Another Driver",
      email: "driver2-vehicle@test.com",
      role: "driver",
    });
    
    const anotherDriver = await db.getUserByOpenId("test-driver-2-vehicle");
    if (!anotherDriver) throw new Error("Failed to create second driver");
    const anotherDriverId = anotherDriver.id;

    // Create vehicle for the new driver
    await db.createVehicle({
      driverId: anotherDriverId,
      make: "Kia",
      model: "Optima",
      year: 2022,
      color: "Silver",
      licensePlate: "KIA-9999",
      vehicleType: "economy" as const,
      capacity: 4,
    });

    // Get vehicles for each driver
    const driver1Vehicles = await db.getVehiclesByDriverId(testDriverId);
    const driver2Vehicles = await db.getVehiclesByDriverId(anotherDriverId);

    // Verify isolation - driver 2 should have at least the Kia vehicle
    expect(driver2Vehicles.length).toBeGreaterThanOrEqual(1);
    const kiaVehicle = driver2Vehicles.find(v => v.licensePlate === "KIA-9999");
    expect(kiaVehicle).toBeDefined();
    expect(kiaVehicle?.make).toBe("Kia");
    
    // Driver 1 should not see driver 2's vehicles
    const driver1LicensePlates = driver1Vehicles.map(v => v.licensePlate);
    expect(driver1LicensePlates).not.toContain("KIA-9999");
  });

  it("should return empty array for driver with no vehicles", async () => {
    await db.upsertUser({
      openId: "test-driver-no-vehicles",
      name: "New Driver",
      email: "newdriver@test.com",
      role: "driver",
    });
    
    const newDriver = await db.getUserByOpenId("test-driver-no-vehicles");
    if (!newDriver) throw new Error("Failed to create new driver");
    const newDriverId = newDriver.id;

    const vehicles = await db.getVehiclesByDriverId(newDriverId);
    expect(vehicles).toEqual([]);
  });

  it("should handle updating license plate", async () => {
    const vehicle = await db.createVehicle({
      driverId: testDriverId,
      make: "Hyundai",
      model: "Elantra",
      year: 2022,
      color: "Blue",
      licensePlate: "OLD-1234",
      vehicleType: "economy" as const,
      capacity: 4,
    });

    await db.updateVehicle(vehicle, {
      licensePlate: "NEW-5678",
    });

    const updated = await db.getVehicleById(vehicle);
    expect(updated?.licensePlate).toBe("NEW-5678");
  });
});
