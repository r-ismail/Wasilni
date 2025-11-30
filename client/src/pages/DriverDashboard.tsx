import { useAuth } from "@/_core/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { MapPin, Navigation, DollarSign, Car, CheckCircle, Users } from "lucide-react";
import { useState, useEffect } from "react";

export default function DriverDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  const [isOnline, setIsOnline] = useState(user?.driverStatus === "available");

  const { data: pendingRides, isLoading: loadingPending } = trpc.driver.getPendingRides.useQuery(undefined, {
    enabled: isOnline,
    refetchInterval: isOnline ? 5000 : false, // Poll every 5 seconds when online
  });

  const { data: vehicles } = trpc.driver.getVehicles.useQuery();

  const updateStatusMutation = trpc.driver.updateStatus.useMutation({
    onSuccess: (_, variables) => {
      const status = variables.status === "available" ? "online" : "offline";
      toast.success(`You are now ${status}`);
      utils.driver.getPendingRides.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
      setIsOnline(!isOnline);
    },
  });

  const acceptRideMutation = trpc.driver.acceptRide.useMutation({
    onSuccess: () => {
      toast.success("Ride accepted! Navigate to pickup location.");
      utils.driver.getPendingRides.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to accept ride: ${error.message}`);
    },
  });

  const handleToggleOnline = (checked: boolean) => {
    setIsOnline(checked);
    updateStatusMutation.mutate({
      status: checked ? "available" : "offline",
    });
  };

  const handleAcceptRide = (rideId: number) => {
    if (!vehicles || vehicles.length === 0) {
      toast.error("Please add a vehicle first");
      return;
    }

    acceptRideMutation.mutate({
      rideId,
      vehicleId: vehicles[0].id, // Use first vehicle
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t('driver.dashboard')}</h1>
          <p className="text-muted-foreground">{t('driver.manageRides')}</p>
        </div>

        {/* Online Status Toggle */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="online-status" className="text-base font-semibold">
                  {t('driver.availabilityStatus')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isOnline ? t('driver.youAreOnline') : t('driver.youAreOffline')}
                </p>
              </div>
              <Switch
                id="online-status"
                checked={isOnline}
                onCheckedChange={handleToggleOnline}
                disabled={updateStatusMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pending Ride Requests */}
        {isOnline && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">{t('driver.rideRequests')}</h2>

            {loadingPending ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-32 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : !pendingRides || pendingRides.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Car className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">{t('driver.noRideRequests')}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('driver.keepPageOpen')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingRides.map((ride) => (
                  <Card key={ride.id} className="border-2 border-primary">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{t('driver.newRideRequest')}</CardTitle>
                        <div className="flex gap-2">
                          <Badge variant="outline">{ride.vehicleType}</Badge>
                          {ride.isShared && (
                            <Badge variant="secondary">
                              <Users className="h-3 w-3 mr-1" />
                              {ride.currentPassengers}/{ride.maxPassengers}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardDescription>
                        Requested {new Date(ride.requestedAt).toLocaleTimeString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-1 text-green-600" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{t('driver.pickup')}</p>
                            <p className="text-sm text-muted-foreground">{ride.pickupAddress}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <Navigation className="h-4 w-4 mt-1 text-red-600" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{t('driver.dropoff')}</p>
                            <p className="text-sm text-muted-foreground">{ride.dropoffAddress}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 font-semibold text-lg">
                          <DollarSign className="h-4 w-4" />
                          {(ride.estimatedFare / 100).toFixed(2)}
                        </span>
                        {ride.distance && (
                          <span className="text-muted-foreground">
                            {(ride.distance / 1000).toFixed(1)} km
                          </span>
                        )}
                        {ride.duration && (
                          <span className="text-muted-foreground">
                            ~{Math.round(ride.duration / 60)} min
                          </span>
                        )}
                      </div>

                      <Button
                        onClick={() => handleAcceptRide(ride.id)}
                        disabled={acceptRideMutation.isPending}
                        className="w-full"
                        size="lg"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {t('driver.acceptRide')}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {!isOnline && (
          <Card>
            <CardContent className="py-12 text-center">
              <Car className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">You are currently offline</p>
              <p className="text-sm text-muted-foreground mt-2">
                Toggle the switch above to start accepting rides
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
