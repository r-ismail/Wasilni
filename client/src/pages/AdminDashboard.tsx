import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Car, DollarSign, TrendingUp, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboard() {
  const { data: stats, isLoading: loadingStats } = trpc.admin.getDashboardStats.useQuery();
  const { data: activeRides, isLoading: loadingRides } = trpc.admin.getActiveRides.useQuery();

  if (loadingStats) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Platform overview and management</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      searching: "status-searching",
      accepted: "status-accepted",
      driver_arriving: "status-accepted",
      in_progress: "status-in-progress",
      completed: "status-completed",
      cancelled: "status-cancelled",
    };

    const statusLabels: Record<string, string> = {
      searching: "Searching",
      accepted: "Accepted",
      driver_arriving: "Driver Arriving",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
    };

    return (
      <Badge className={statusClasses[status] || ""}>
        {statusLabels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Platform overview and management</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">Registered users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeDrivers || 0}</div>
              <p className="text-xs text-muted-foreground">
                of {stats?.totalDrivers || 0} total drivers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${((stats?.totalRevenue || 0) / 100).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                From {stats?.completedRides || 0} completed rides
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Rides</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeRides || 0}</div>
              <p className="text-xs text-muted-foreground">
                of {stats?.totalRides || 0} total rides
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Active Rides */}
        <Card>
          <CardHeader>
            <CardTitle>Active Rides</CardTitle>
            <CardDescription>Real-time ride monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRides ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : !activeRides || activeRides.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No active rides at the moment
              </div>
            ) : (
              <div className="space-y-4">
                {activeRides.map((ride) => (
                  <div
                    key={ride.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="bg-primary/10 p-3 rounded-full">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">Ride #{ride.id}</p>
                          {getStatusBadge(ride.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {ride.pickupAddress} → {ride.dropoffAddress}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Rider ID: {ride.riderId} | Driver ID: {ride.driverId || "Unassigned"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${(ride.estimatedFare / 100).toFixed(2)}</p>
                      <Badge variant="outline" className="mt-1">
                        {ride.vehicleType}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
