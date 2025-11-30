import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { getIO } from "./_core/socket";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { getDb } from "./db";
import { users, rides } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

// Driver-only procedure
const driverProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'driver' && ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Driver access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        profilePhoto: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertUser({
          openId: ctx.user.openId,
          ...input,
        });
        return { success: true };
      }),
  }),

  // ============ RIDER OPERATIONS ============
  rider: router({
    // Ride-sharing endpoints
    findSharedRides: protectedProcedure
      .input(z.object({
        pickupLatitude: z.string(),
        pickupLongitude: z.string(),
        dropoffLatitude: z.string(),
        dropoffLongitude: z.string(),
        vehicleType: z.enum(["economy", "comfort", "premium"]),
      }))
      .query(async ({ input }) => {
        const compatibleRides = await db.findCompatibleSharedRides(
          parseFloat(input.pickupLatitude),
          parseFloat(input.pickupLongitude),
          parseFloat(input.dropoffLatitude),
          parseFloat(input.dropoffLongitude),
          input.vehicleType
        );
        return compatibleRides;
      }),
    
    joinSharedRide: protectedProcedure
      .input(z.object({
        rideId: z.number(),
        pickupAddress: z.string(),
        pickupLatitude: z.string(),
        pickupLongitude: z.string(),
        dropoffAddress: z.string(),
        dropoffLatitude: z.string(),
        dropoffLongitude: z.string(),
        fare: z.number(), // individual fare in cents
      }))
      .mutation(async ({ ctx, input }) => {
        const ride = await db.getRideById(input.rideId);
        if (!ride) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Ride not found' });
        }
        
        if (!ride.isShared) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'This is not a shared ride' });
        }
        
        if (ride.currentPassengers >= ride.maxPassengers) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ride is full' });
        }
        
        if (ride.status !== "searching" && ride.status !== "accepted") {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ride has already started' });
        }
        
        // Add passenger to ride
        await db.addPassengerToRide({
          rideId: input.rideId,
          passengerId: ctx.user.id,
          pickupAddress: input.pickupAddress,
          pickupLatitude: input.pickupLatitude,
          pickupLongitude: input.pickupLongitude,
          dropoffAddress: input.dropoffAddress,
          dropoffLatitude: input.dropoffLatitude,
          dropoffLongitude: input.dropoffLongitude,
          fare: input.fare,
          status: "waiting",
        });
        
        // Increment passenger count
        await db.incrementRidePassengerCount(input.rideId);
        
        return { success: true };
      }),
    
    getRidePassengers: protectedProcedure
      .input(z.object({ rideId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPassengersByRideId(input.rideId);
      }),

    requestRide: protectedProcedure
      .input(z.object({
        pickupAddress: z.string(),
        pickupLatitude: z.string(),
        pickupLongitude: z.string(),
        dropoffAddress: z.string(),
        dropoffLatitude: z.string(),
        dropoffLongitude: z.string(),
        vehicleType: z.enum(["economy", "comfort", "premium"]),
        estimatedFare: z.number(), // in cents
        distance: z.number().optional(), // in meters
        duration: z.number().optional(), // in seconds
        isShared: z.boolean().optional(),
        maxPassengers: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const rideData: any = {
          riderId: ctx.user.id,
          ...input,
          status: "searching",
        };
        
        // If shared ride, add the creator as first passenger
        if (input.isShared) {
          rideData.isShared = true;
          rideData.maxPassengers = input.maxPassengers || 4;
          rideData.currentPassengers = 1;
        }
        
        const result = await db.createRide(rideData);
        const rideId = (result as any).insertId ? Number((result as any).insertId) : 0;
        
        // If shared ride, add creator as first passenger
        if (input.isShared && rideId > 0) {
          await db.addPassengerToRide({
            rideId,
            passengerId: ctx.user.id,
            pickupAddress: input.pickupAddress,
            pickupLatitude: input.pickupLatitude,
            pickupLongitude: input.pickupLongitude,
            dropoffAddress: input.dropoffAddress,
            dropoffLatitude: input.dropoffLatitude,
            dropoffLongitude: input.dropoffLongitude,
            fare: input.estimatedFare,
            status: "waiting",
          });
        }
        
        // In a real app, this would trigger WebSocket notifications to available drivers
        return { 
          success: true, 
          rideId
        };
      }),
    
    getRideHistory: protectedProcedure.query(async ({ ctx }) => {
      return await db.getRidesByRiderId(ctx.user.id);
    }),
    
    getRideById: protectedProcedure
      .input(z.object({ rideId: z.number() }))
      .query(async ({ ctx, input }) => {
        const ride = await db.getRideById(input.rideId);
        if (!ride || ride.riderId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Ride not found' });
        }
        return ride;
      }),

    getActiveRide: protectedProcedure.query(async ({ ctx }) => {
      const rides = await db.getRidesByRiderId(ctx.user.id);
      const activeRide = rides.find(
        (r) => r.status === "accepted" || r.status === "in_progress" || r.status === "driver_arriving"
      );

      if (!activeRide) {
        return null;
      }

      // Get driver details if ride is accepted
      if (activeRide.driverId) {
        const database = await getDb();
        if (database) {
          const driverData = await database
            .select()
            .from(users)
            .where(eq(users.id, activeRide.driverId))
            .limit(1);

          if (driverData.length > 0) {
            const driver = driverData[0];
            return {
              ...activeRide,
              driver: {
                id: driver.id,
                name: driver.name,
                phone: driver.phone,
                profilePhoto: driver.profilePhoto,
                averageRating: (driver.averageRating || 0) / 100,
                currentLatitude: driver.currentLatitude ? parseFloat(driver.currentLatitude) : null,
                currentLongitude: driver.currentLongitude ? parseFloat(driver.currentLongitude) : null,
              },
            };
          }
        }
      }

      return activeRide;
    }),
    
    cancelRide: protectedProcedure
      .input(z.object({
        rideId: z.number(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const ride = await db.getRideById(input.rideId);
        if (!ride || ride.riderId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Ride not found' });
        }
        
        if (ride.status === "completed" || ride.status === "cancelled") {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot cancel this ride' });
        }
        
        await db.updateRideStatus(input.rideId, "cancelled", {
          cancellationReason: input.reason,
          cancelledBy: "rider",
        });
        
        // If driver was assigned, set them back to available
        if (ride.driverId) {
          await db.updateDriverStatus(ride.driverId, "available");
          
          // Emit real-time status update to driver
          const io = getIO();
          if (io) {
            io.to(`driver:${ride.driverId}`).emit("ride:status:update", {
              rideId: input.rideId,
              status: "cancelled",
              cancelledBy: "rider",
              timestamp: new Date().toISOString(),
            });
          }
        }
        
        return { success: true };
      }),
    
    rateDriver: protectedProcedure
      .input(z.object({
        rideId: z.number(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const ride = await db.getRideById(input.rideId);
        if (!ride || ride.riderId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Ride not found' });
        }
        
        if (ride.status !== "completed") {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Can only rate completed rides' });
        }
        
        await db.updateRating(input.rideId, {
          riderToDriverRating: input.rating,
          riderToDriverComment: input.comment,
        });
        
        // Update driver's average rating
        if (ride.driverId) {
          const driverRides = await db.getRidesByDriverId(ride.driverId);
          const completedRides = driverRides.filter(r => r.status === "completed");
          
          let totalRating = 0;
          let ratedCount = 0;
          
          for (const r of completedRides) {
            const rating = await db.getRatingByRideId(r.id);
            if (rating?.riderToDriverRating) {
              totalRating += rating.riderToDriverRating;
              ratedCount++;
            }
          }
          
          if (ratedCount > 0) {
            const avgRating = Math.round((totalRating / ratedCount) * 100); // Store as integer
            await db.upsertUser({
              openId: (await db.getUserById(ride.driverId))!.openId,
              averageRating: avgRating,
            });
          }
        }
        
        return { success: true };
      }),
  }),

  // ============ DRIVER OPERATIONS ============
  driver: router({
    updateStatus: driverProcedure
      .input(z.object({
        status: z.enum(["offline", "available", "busy"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateDriverStatus(ctx.user.id, input.status);
        return { success: true };
      }),
    
    updateLocation: driverProcedure
      .input(z.object({
        latitude: z.string(),
        longitude: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateDriverLocation(ctx.user.id, input.latitude, input.longitude);
        return { success: true };
      }),
    
    getPendingRides: driverProcedure.query(async () => {
      return await db.getPendingRides();
    }),
    
    acceptRide: driverProcedure
      .input(z.object({
        rideId: z.number(),
        vehicleId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const ride = await db.getRideById(input.rideId);
        if (!ride) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Ride not found' });
        }
        
        if (ride.status !== "searching") {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ride is no longer available' });
        }
        
        // Verify vehicle belongs to driver
        const vehicle = await db.getVehicleById(input.vehicleId);
        if (!vehicle || vehicle.driverId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Invalid vehicle' });
        }
        
        await db.assignDriverToRide(input.rideId, ctx.user.id, input.vehicleId);
        await db.updateDriverStatus(ctx.user.id, "busy");
        
        // Emit real-time status update
        const io = getIO();
        if (io) {
          io.to(`rider:${ride.riderId}`).emit("ride:status:update", {
            rideId: input.rideId,
            status: "accepted",
            driverId: ctx.user.id,
            timestamp: new Date().toISOString(),
          });
        }
        
        return { success: true };
      }),
    
    updateRideStatus: driverProcedure
      .input(z.object({
        rideId: z.number(),
        status: z.enum(["driver_arriving", "in_progress", "completed"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const ride = await db.getRideById(input.rideId);
        if (!ride || ride.driverId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Ride not found' });
        }
        
        await db.updateRideStatus(input.rideId, input.status);
        
        // Emit real-time status update
        const io = getIO();
        if (io) {
          io.to(`rider:${ride.riderId}`).emit("ride:status:update", {
            rideId: input.rideId,
            status: input.status,
            driverId: ctx.user.id,
            timestamp: new Date().toISOString(),
          });
        }
        
        // If completed, set driver back to available and create payment
        if (input.status === "completed") {
          await db.updateDriverStatus(ctx.user.id, "available");
          
          // Create payment record
          await db.createPayment({
            rideId: input.rideId,
            riderId: ride.riderId,
            driverId: ctx.user.id,
            amount: ride.actualFare || ride.estimatedFare,
            paymentMethod: "cash", // Default, can be updated
            status: "completed",
          });
          
          // Update driver's total rides
          await db.upsertUser({
            openId: ctx.user.openId,
            totalRides: (ctx.user.totalRides || 0) + 1,
          });
        }
        
        return { success: true };
      }),

    getRideHistory: protectedProcedure.query(async ({ ctx }) => {
      return await db.getRidesByRiderId(ctx.user.id);
    }),

    getEarnings: protectedProcedure.query(async ({ ctx }) => {
      const payments = await db.getPaymentsByDriverId(ctx.user.id);
      const totalEarnings = payments.reduce((sum, p) => sum + p.amount, 0);
      
      return {
        totalEarnings,
        payments,
      };
    }),
    
    rateRider: driverProcedure
      .input(z.object({
        rideId: z.number(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const ride = await db.getRideById(input.rideId);
        if (!ride || ride.driverId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Ride not found' });
        }
        
        if (ride.status !== "completed") {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Can only rate completed rides' });
        }
        
        await db.updateRating(input.rideId, {
          driverToRiderRating: input.rating,
          driverToRiderComment: input.comment,
        });
        
        return { success: true };
      }),
    
    // Vehicle management
    addVehicle: driverProcedure
      .input(z.object({
        make: z.string(),
        model: z.string(),
        year: z.number(),
        color: z.string(),
        licensePlate: z.string(),
        vehicleType: z.enum(["economy", "comfort", "premium"]),
        capacity: z.number().default(4),
        photo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createVehicle({
          driverId: ctx.user.id,
          ...input,
        });
        return { success: true };
      }),
    
    getVehicles: driverProcedure.query(async ({ ctx }) => {
      return await db.getVehiclesByDriverId(ctx.user.id);
    }),
    
    // Passenger management for shared rides
    updatePassengerStatus: driverProcedure
      .input(z.object({
        passengerId: z.number(),
        status: z.enum(["waiting", "picked_up", "dropped_off"]),
      }))
      .mutation(async ({ input }) => {
        await db.updatePassengerStatus(input.passengerId, input.status);
        return { success: true };
      }),
  }),

  // ============ ADMIN OPERATIONS ============
  admin: router({
    // Cancellation Management
    getCancellationStats: adminProcedure.query(async () => {
      const database = await getDb();
      if (!database) return { totalCancellations: 0, cancellationRate: 0, byReason: {}, byUser: {} };

      const allRides = await database.select().from(rides);
      const cancelledRides = allRides.filter(r => r.status === "cancelled");
      const totalRides = allRides.length;
      const totalCancellations = cancelledRides.length;
      const cancellationRate = totalRides > 0 ? (totalCancellations / totalRides) * 100 : 0;

      const byReason: Record<string, number> = {};
      cancelledRides.forEach(ride => {
        const reason = ride.cancellationReason || "No reason provided";
        byReason[reason] = (byReason[reason] || 0) + 1;
      });

      const byUser: Record<string, number> = {};
      cancelledRides.forEach(ride => {
        const cancelledBy = ride.cancelledBy || "unknown";
        byUser[cancelledBy] = (byUser[cancelledBy] || 0) + 1;
      });

      return {
        totalCancellations,
        cancellationRate: Math.round(cancellationRate * 100) / 100,
        byReason,
        byUser,
      };
    }),

    getCancelledRides: adminProcedure
      .input(z.object({
        cancelledBy: z.enum(["rider", "driver", "admin", "system", "all"]).optional(),
        refundStatus: z.enum(["pending", "processed", "rejected", "all"]).optional(),
      }).optional())
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) return [];

        const results = await database.select().from(rides).where(eq(rides.status, "cancelled"));
        
        let filtered = results;
        if (input?.cancelledBy && input.cancelledBy !== "all") {
          filtered = filtered.filter(r => r.cancelledBy === input.cancelledBy);
        }
        
        if (input?.refundStatus && input.refundStatus !== "all") {
          filtered = filtered.filter(r => r.refundStatus === input.refundStatus);
        }

        const enrichedRides = await Promise.all(filtered.map(async (ride) => {
          const riderData = await database.select().from(users).where(eq(users.id, ride.riderId)).limit(1);
          const driverData = ride.driverId ? await database.select().from(users).where(eq(users.id, ride.driverId)).limit(1) : [];
          
          return {
            ...ride,
            rider: riderData[0] ? { id: riderData[0].id, name: riderData[0].name, email: riderData[0].email } : null,
            driver: driverData[0] ? { id: driverData[0].id, name: driverData[0].name, email: driverData[0].email } : null,
          };
        }));

        return enrichedRides.sort((a, b) => {
          const aTime = a.cancelledAt?.getTime() || 0;
          const bTime = b.cancelledAt?.getTime() || 0;
          return bTime - aTime;
        });
      }),

    processRefund: adminProcedure
      .input(z.object({
        rideId: z.number(),
        refundAmount: z.number(),
        refundStatus: z.enum(["processed", "rejected"]),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        const ride = await database.select().from(rides).where(eq(rides.id, input.rideId)).limit(1);
        if (!ride[0]) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Ride not found' });
        }

        if (ride[0].status !== "cancelled") {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ride is not cancelled' });
        }

        await database.update(rides)
          .set({
            refundAmount: input.refundAmount,
            refundStatus: input.refundStatus,
          })
          .where(eq(rides.id, input.rideId));

        return { success: true };
      }),

    getDashboardStats: adminProcedure.query(async () => {
      const allRides = await db.getAllRides();
      const allUsers = await db.getAllUsers();
      const activeRides = await db.getActiveRides();
      
      const completedRides = allRides.filter(r => r.status === "completed");
      const totalRevenue = completedRides.reduce((sum, r) => sum + (r.actualFare || r.estimatedFare), 0);
      
      const drivers = allUsers.filter(u => u.role === "driver");
      const activeDrivers = drivers.filter(d => d.driverStatus === "available" || d.driverStatus === "busy");
      
      return {
        totalRides: allRides.length,
        completedRides: completedRides.length,
        activeRides: activeRides.length,
        totalRevenue,
        totalUsers: allUsers.length,
        totalDrivers: drivers.length,
        activeDrivers: activeDrivers.length,
      };
    }),
    
    getAllUsers: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),
    
    getAllRides: adminProcedure.query(async () => {
      return await db.getAllRides();
    }),
    
    getActiveRides: adminProcedure.query(async () => {
      return await db.getActiveRides();
    }),
    
    updateUserRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["rider", "driver", "admin"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserRole(input.userId, input.role);
        return { success: true };
      }),
    
    verifyDriver: adminProcedure
      .input(z.object({
        userId: z.number(),
        isVerified: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }
        
        await db.upsertUser({
          openId: user.openId,
          isVerified: input.isVerified,
        });
        
        return { success: true };
      }),
    
    cancelRide: adminProcedure
      .input(z.object({
        rideId: z.number(),
        reason: z.string(),
      }))
      .mutation(async ({ input }) => {
        const ride = await db.getRideById(input.rideId);
        if (!ride) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Ride not found' });
        }
        
        await db.updateRideStatus(input.rideId, "cancelled", {
          cancellationReason: input.reason,
          cancelledBy: "admin",
        });
        
        // If driver was assigned, set them back to available
        if (ride.driverId) {
          await db.updateDriverStatus(ride.driverId, "available");
        }
        
        return { success: true };
      }),
  }),

  // ============ LOCATION MANAGEMENT ============
  locations: router({
    getSavedLocations: protectedProcedure.query(async ({ ctx }) => {
      return await db.getSavedLocationsByUserId(ctx.user.id);
    }),
    
    addSavedLocation: protectedProcedure
      .input(z.object({
        label: z.string(),
        address: z.string(),
        latitude: z.string(),
        longitude: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.addSavedLocation({
          userId: ctx.user.id,
          ...input,
        });
        return { success: true };
      }),
    
    deleteSavedLocation: protectedProcedure
      .input(z.object({ locationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteSavedLocation(input.locationId, ctx.user.id);
        return { success: true };
      }),
    
    getRecentLocations: protectedProcedure.query(async ({ ctx }) => {
      return await db.getRecentLocationsByUserId(ctx.user.id);
    }),
    
    addRecentLocation: protectedProcedure
      .input(z.object({
        address: z.string(),
        latitude: z.string(),
        longitude: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.addRecentLocation({
          userId: ctx.user.id,
          ...input,
        });
        return { success: true };
      }),
  }),

  // ============ COMMON OPERATIONS ============
  common: router({
    getAvailableDrivers: publicProcedure.query(async () => {
      const database = await getDb();
      if (!database) return [];

      // Get drivers who are online and have updated location recently (within 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const drivers = await database
        .select()
        .from(users)
        .where(
          eq(users.driverStatus, "available")
        );

      // Filter drivers with recent location updates
      return drivers
        .filter(
          (d) =>
            d.currentLatitude &&
            d.currentLongitude &&
            d.lastLocationUpdate &&
            new Date(d.lastLocationUpdate) > fiveMinutesAgo
        )
        .map((d) => ({
          id: d.id,
          name: d.name,
          latitude: parseFloat(d.currentLatitude!),
          longitude: parseFloat(d.currentLongitude!),
          averageRating: (d.averageRating || 0) / 100,
        }));
    }),
    
    calculateFare: publicProcedure
      .input(z.object({
        distance: z.number(), // in meters
        vehicleType: z.enum(["economy", "comfort", "premium"]),
        isShared: z.boolean().optional(),
        currentPassengers: z.number().optional(),
      }))
      .query(({ input }) => {
        // Simple fare calculation: base fare + per km rate
        const distanceKm = input.distance / 1000;
        
        const rates = {
          economy: { base: 300, perKm: 80 }, // in cents
          comfort: { base: 500, perKm: 120 },
          premium: { base: 800, perKm: 180 },
        };
        
        const rate = rates[input.vehicleType];
        let fare = rate.base + (distanceKm * rate.perKm);
        
        // Apply discount for shared rides (20% off per additional passenger)
        if (input.isShared) {
          const discount = 0.20; // 20% discount
          fare = fare * (1 - discount);
        }
        
        return {
          estimatedFare: Math.round(fare),
          currency: "USD",
          isShared: input.isShared || false,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
