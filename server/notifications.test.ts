import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Notification System", () => {
  let testUserId: number;

  beforeAll(async () => {
    // Create a test user
    const openId = `test-notification-user-${Date.now()}`;
    await db.upsertUser({
      openId,
      name: "Test Notification User",
      email: "test-notification@example.com",
    });

    const user = await db.getUserByOpenId(openId);
    if (!user) {
      throw new Error("Failed to create test user");
    }
    testUserId = user.id;
  });

  it("should create a notification", async () => {
    const notificationId = await db.createNotification({
      userId: testUserId,
      type: "ride_accepted",
      title: "Test Notification",
      message: "This is a test notification",
      rideId: 1,
    });

    expect(notificationId).toBeDefined();
    expect(typeof notificationId).toBe("number");
  });

  it("should get notifications for a user", async () => {
    // Create a notification first
    await db.createNotification({
      userId: testUserId,
      type: "driver_arriving",
      title: "Driver Arriving",
      message: "Your driver is on the way",
      rideId: 1,
    });

    const notifications = await db.getNotifications(testUserId);
    expect(notifications).toBeDefined();
    expect(Array.isArray(notifications)).toBe(true);
    expect(notifications.length).toBeGreaterThan(0);
  });

  it("should get unread notification count", async () => {
    const count = await db.getUnreadNotificationCount(testUserId);
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("should mark notification as read", async () => {
    // Create a notification
    const notificationId = await db.createNotification({
      userId: testUserId,
      type: "trip_started",
      title: "Trip Started",
      message: "Your trip has started",
      rideId: 1,
    });

    // Mark it as read
    await db.markNotificationAsRead(notificationId!, testUserId);

    // Verify it's marked as read
    const notifications = await db.getNotifications(testUserId);
    const notification = notifications.find(n => n.id === notificationId);
    expect(notification?.isRead).toBe(true);
  });

  it("should mark all notifications as read", async () => {
    // Create multiple notifications
    await db.createNotification({
      userId: testUserId,
      type: "trip_completed",
      title: "Trip Completed",
      message: "Your trip is complete",
      rideId: 1,
    });

    await db.createNotification({
      userId: testUserId,
      type: "payment_completed",
      title: "Payment Completed",
      message: "Payment processed successfully",
      rideId: 1,
    });

    // Mark all as read
    await db.markAllNotificationsAsRead(testUserId);

    // Verify all are marked as read
    const unreadCount = await db.getUnreadNotificationCount(testUserId);
    expect(unreadCount).toBe(0);
  });

  it("should create notification via tRPC endpoint", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: "test-user",
        name: "Test User",
        email: null,
        phone: null,
        loginMethod: null,
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
        lastLocationUpdate: null,
      },
      req: {} as any,
      res: {} as any,
    });

    const notifications = await caller.notifications.getNotifications();
    expect(notifications).toBeDefined();
    expect(Array.isArray(notifications)).toBe(true);
  });

  it("should get unread count via tRPC endpoint", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: "test-user",
        name: "Test User",
        email: null,
        phone: null,
        loginMethod: null,
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
        lastLocationUpdate: null,
      },
      req: {} as any,
      res: {} as any,
    });

    const count = await caller.notifications.getUnreadCount();
    expect(typeof count).toBe("number");
  });

  it("should mark notification as read via tRPC endpoint", async () => {
    // Create a notification
    const notificationId = await db.createNotification({
      userId: testUserId,
      type: "system",
      title: "System Notification",
      message: "Test system message",
    });

    const caller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: "test-user",
        name: "Test User",
        email: null,
        phone: null,
        loginMethod: null,
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
        lastLocationUpdate: null,
      },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.notifications.markAsRead({ notificationId: notificationId! });
    expect(result.success).toBe(true);
  });

  it("should mark all notifications as read via tRPC endpoint", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: "test-user",
        name: "Test User",
        email: null,
        phone: null,
        loginMethod: null,
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
        lastLocationUpdate: null,
      },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.notifications.markAllAsRead();
    expect(result.success).toBe(true);
  });
});
