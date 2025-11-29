import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, Navigation, Users, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function DriverActiveRide() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: rideHistory } = trpc.driver.getRideHistory.useQuery();
  const activeRide = rideHistory?.find(
    (r) => r.status === "accepted" || r.status === "driver_arriving" || r.status === "in_progress"
  );

  const { data: passengers } = trpc.rider.getRidePassengers.useQuery(
    { rideId: activeRide?.id || 0 },
    { enabled: !!activeRide && activeRide.isShared }
  );

  const updateRideStatusMutation = trpc.driver.updateRideStatus.useMutation({
    onSuccess: () => {
      toast.success("Ride status updated");
      utils.driver.getRideHistory.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const updatePassengerStatusMutation = trpc.driver.updatePassengerStatus.useMutation({
    onSuccess: () => {
      toast.success("Passenger status updated");
      utils.rider.getRidePassengers.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update passenger: ${error.message}`);
    },
  });

  const handleUpdateRideStatus = (status: "driver_arriving" | "in_progress" | "completed") => {
    if (!activeRide) return;
    updateRideStatusMutation.mutate({
      rideId: activeRide.id,
      status,
    });
  };

  const handlePickupPassenger = (passengerId: number) => {
    updatePassengerStatusMutation.mutate({
      passengerId,
      status: "picked_up",
    });
  };

  const handleDropoffPassenger = (passengerId: number) => {
    updatePassengerStatusMutation.mutate({
      passengerId,
      status: "dropped_off",
    });
  };

  if (!activeRide) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No active ride</p>
              <Button onClick={() => setLocation("/driver/dashboard")} className="mt-4">
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Active Ride</h1>
          <p className="text-muted-foreground">Manage your current ride</p>
        </div>

        {/* Ride Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Ride #{activeRide.id}</CardTitle>
            <CardDescription>
              {activeRide.isShared ? (
                <Badge variant="outline" className="mr-2">
                  <Users className="h-3 w-3 mr-1" />
                  Shared Ride ({activeRide.currentPassengers} passengers)
                </Badge>
              ) : (
                <Badge variant="outline">Single Ride</Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-1 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Pickup</p>
                  <p className="text-sm text-muted-foreground">{activeRide.pickupAddress}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Navigation className="h-4 w-4 mt-1 text-red-600" />
                <div>
                  <p className="text-sm font-medium">Dropoff</p>
                  <p className="text-sm text-muted-foreground">{activeRide.dropoffAddress}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {activeRide.status === "accepted" && (
                <Button onClick={() => handleUpdateRideStatus("driver_arriving")} className="flex-1">
                  Heading to Pickup
                </Button>
              )}
              {activeRide.status === "driver_arriving" && (
                <Button onClick={() => handleUpdateRideStatus("in_progress")} className="flex-1">
                  Start Trip
                </Button>
              )}
              {activeRide.status === "in_progress" && (
                <Button onClick={() => handleUpdateRideStatus("completed")} className="flex-1">
                  Complete Ride
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Passengers List (for shared rides) */}
        {activeRide.isShared && passengers && passengers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Passengers</CardTitle>
              <CardDescription>Manage pickup and dropoff for each passenger</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {passengers.map((passenger) => (
                  <Card key={passenger.id} className="border">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Passenger #{passenger.passengerId}</p>
                            <Badge
                              variant={
                                passenger.status === "dropped_off"
                                  ? "default"
                                  : passenger.status === "picked_up"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {passenger.status === "waiting" && "Waiting"}
                              {passenger.status === "picked_up" && "In Vehicle"}
                              {passenger.status === "dropped_off" && "Completed"}
                            </Badge>
                          </div>
                          <p className="font-bold">${(passenger.fare / 100).toFixed(2)}</p>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-3 w-3 mt-1 text-green-600" />
                            <div>
                              <p className="font-medium">Pickup</p>
                              <p className="text-muted-foreground">{passenger.pickupAddress}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <Navigation className="h-3 w-3 mt-1 text-red-600" />
                            <div>
                              <p className="font-medium">Dropoff</p>
                              <p className="text-muted-foreground">{passenger.dropoffAddress}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {passenger.status === "waiting" && (
                            <Button
                              onClick={() => handlePickupPassenger(passenger.id)}
                              size="sm"
                              className="flex-1"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Pick Up
                            </Button>
                          )}
                          {passenger.status === "picked_up" && (
                            <Button
                              onClick={() => handleDropoffPassenger(passenger.id)}
                              size="sm"
                              className="flex-1"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Drop Off
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
