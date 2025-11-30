import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

let io: SocketIOServer | null = null;

export function initializeSocket(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/socket.io/",
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Driver joins their own room for targeted updates
    socket.on("driver:join", (driverId: number) => {
      socket.join(`driver:${driverId}`);
      console.log(`[Socket.IO] Driver ${driverId} joined room`);
    });

    // Rider joins their own room for targeted updates
    socket.on("rider:join", (riderId: number) => {
      socket.join(`rider:${riderId}`);
      console.log(`[Socket.IO] Rider ${riderId} joined room`);
    });

    // Driver location update
    socket.on("driver:location", async (data: { driverId: number; latitude: number; longitude: number }) => {
      try {
        const db = await getDb();
        if (!db) {
          console.error("[Socket.IO] Database not available");
          return;
        }

        // Update driver location in database
        await db
          .update(users)
          .set({
            currentLatitude: data.latitude.toString(),
            currentLongitude: data.longitude.toString(),
            lastLocationUpdate: new Date(),
          })
          .where(eq(users.id, data.driverId));

        // Broadcast to all riders looking for drivers
        io?.emit("driver:location:update", {
          driverId: data.driverId,
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: new Date().toISOString(),
        });

        console.log(`[Socket.IO] Driver ${data.driverId} location updated: ${data.latitude}, ${data.longitude}`);
      } catch (error) {
        console.error("[Socket.IO] Error updating driver location:", error);
      }
    });

    // Ride status update (for real-time notifications)
    socket.on("ride:status", (data: { rideId: number; status: string; riderId: number; driverId?: number }) => {
      // Notify rider
      io?.to(`rider:${data.riderId}`).emit("ride:status:update", {
        rideId: data.rideId,
        status: data.status,
        timestamp: new Date().toISOString(),
      });

      // Notify driver if present
      if (data.driverId) {
        io?.to(`driver:${data.driverId}`).emit("ride:status:update", {
          rideId: data.rideId,
          status: data.status,
          timestamp: new Date().toISOString(),
        });
      }

      console.log(`[Socket.IO] Ride ${data.rideId} status updated to ${data.status}`);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  console.log("[Socket.IO] Server initialized");
  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}
