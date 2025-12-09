import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // LOCAL DEVELOPMENT: Bypass authentication
  // if (process.env.NODE_ENV === 'development') {
  //   console.log('[Local Dev] Using mock admin user');
  //   return {
  //     req: opts.req,
  //     res: opts.res,
  //     user: {
  //       id: 1,
  //       openId: 'local-admin-dev',
  //       name: 'Local Admin',
  //       email: 'admin@localhost.dev',
  //       phone: null,
  //       loginMethod: 'local',
  //       role: 'admin',
  //       profilePhoto: null,
  //       licenseNumber: null,
  //       driverStatus: 'available',
  //       currentLatitude: null,
  //       currentLongitude: null,
  //       isVerified: true,
  //       totalRides: 0,
  //       averageRating: 0,
  //       createdAt: new Date(),
  //       updatedAt: new Date(),
  //       lastSignedIn: new Date(),
  //       lastLocationUpdate: null,
  //     } as unknown as User,
  //   };
  // }
  // END LOCAL DEVELOPMENT BYPASS

  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
