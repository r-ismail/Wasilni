import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";

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
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createRide({
          riderId: ctx.user.id,
          ...input,
          status: "searching",
        });
        
        // In a real app, this would trigger WebSocket notifications to available drivers
        const insertId = (result as any).insertId;
        return { 
          success: true, 
          rideId: insertId ? Number(insertId) : 0
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
    
    getRideHistory: driverProcedure.query(async ({ ctx }) => {
      return await db.getRidesByDriverId(ctx.user.id);
    }),
    
    getEarnings: driverProcedure.query(async ({ ctx }) => {
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
  }),

  // ============ ADMIN OPERATIONS ============
  admin: router({
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

  // ============ COMMON OPERATIONS ============
  common: router({
    getAvailableDrivers: publicProcedure.query(async () => {
      return await db.getAvailableDrivers();
    }),
    
    calculateFare: publicProcedure
      .input(z.object({
        distance: z.number(), // in meters
        vehicleType: z.enum(["economy", "comfort", "premium"]),
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
        const fare = rate.base + (distanceKm * rate.perKm);
        
        return {
          estimatedFare: Math.round(fare),
          currency: "USD",
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
