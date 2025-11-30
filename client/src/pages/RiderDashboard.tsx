import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { MapView } from "@/components/Map";
import { LocationSearchInput } from "@/components/LocationSearchInput";
import { LiveRideTracking } from "@/components/LiveRideTracking";
import { useSocket } from "@/contexts/SocketContext";
import { notificationManager } from "@/lib/notifications";
import { Loader2, MapPin, Navigation, Users, Star, DollarSign } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function RiderDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { socket, isConnected } = useSocket();
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupLat, setPickupLat] = useState("");
  const [pickupLng, setPickupLng] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoffLat, setDropoffLat] = useState("");
  const [dropoffLng, setDropoffLng] = useState("");
  const [vehicleType, setVehicleType] = useState<"economy" | "comfort" | "premium">("economy");
  const [isShared, setIsShared] = useState(false);
  const [showCompatibleRides, setShowCompatibleRides] = useState(false);
  const [estimatedFare, setEstimatedFare] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [mapServices, setMapServices] = useState<any>(null);
  
  // Save location dialog states
  const [showSavePickupDialog, setShowSavePickupDialog] = useState(false);
  const [showSaveDropoffDialog, setShowSaveDropoffDialog] = useState(false);
  const [saveLocationLabel, setSaveLocationLabel] = useState("");

  const { data: savedLocations, refetch: refetchSavedLocations } = trpc.locations.getSavedLocations.useQuery();
  const { data: recentLocations } = trpc.locations.getRecentLocations.useQuery();
  const { data: activeRide, refetch: refetchActiveRide } = trpc.rider.getActiveRide.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const { data: sharedRidesData, refetch: refetchSharedRides } = trpc.rider.findSharedRides.useQuery(
    {
      pickupLatitude: pickupLat,
      pickupLongitude: pickupLng,
      dropoffLatitude: dropoffLat,
      dropoffLongitude: dropoffLng,
      vehicleType,
    },
    {
      enabled: false,
    }
  );

  const addRecentLocationMutation = trpc.locations.addRecentLocation.useMutation();
  
  const addSavedLocationMutation = trpc.locations.addSavedLocation.useMutation({
    onSuccess: () => {
      toast.success(t('rider.locationSaved'));
      setShowSavePickupDialog(false);
      setShowSaveDropoffDialog(false);
      setSaveLocationLabel("");
      refetchSavedLocations();
    },
    onError: () => {
      toast.error(t('common.error'));
    },
  });

  const joinSharedRideMutation = trpc.rider.joinSharedRide.useMutation({
    onSuccess: () => {
      toast.success(t('rider.joinedSharedRide'));
      setShowCompatibleRides(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to join ride: ${error.message}`);
    },
  });

  const requestRideMutation = trpc.rider.requestRide.useMutation({
    onSuccess: () => {
      toast.success(t('rider.rideRequested'));
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to request ride: ${error.message}`);
    },
  });

  const resetForm = () => {
    setPickupAddress("");
    setPickupLat("");
    setPickupLng("");
    setDropoffAddress("");
    setDropoffLat("");
    setDropoffLng("");
    setEstimatedFare(null);
    setDistance(null);
    setDuration(null);
    setShowCompatibleRides(false);
  };

  // Listen for real-time ride status updates
  useEffect(() => {
    if (!socket || !user) return;

    // Join rider room for targeted updates
    socket.emit("rider:join", user.id);

    // Listen for ride status updates
    const handleStatusUpdate = (data: { rideId: number; status: string; timestamp: string }) => {
      console.log("[Rider] Ride status update:", data);
      
      // Show toast notification based on status
      switch (data.status) {
        case "accepted":
          toast.success(t('rider.rideAccepted'));
          // Show push notification
          notificationManager.showRideAccepted((data as any).driverName || 'Your driver');
          refetchActiveRide();
          break;
        case "driver_arriving":
          toast.info(t('rider.driverArriving'));
          // Show push notification if ETA < 2 minutes
          const eta = (data as any).eta || 0;
          if (eta <= 2) {
            notificationManager.showDriverArriving((data as any).driverName || 'Your driver', eta);
          }
          refetchActiveRide();
          break;
        case "in_progress":
          toast.info(t('rider.tripStarted'));
          notificationManager.showTripStarted();
          refetchActiveRide();
          break;
        case "completed":
          toast.success(t('rider.tripCompleted'));
          notificationManager.showTripCompleted((data as any).fare || 0);
          refetchActiveRide();
          break;
        case "cancelled":
          toast.error(t('rider.rideCancelled'));
          notificationManager.showRideCancelled((data as any).reason);
          refetchActiveRide();
          break;
      }
    };

    socket.on("ride:status:update", handleStatusUpdate);

    return () => {
      socket.off("ride:status:update", handleStatusUpdate);
    };
  }, [socket, user, t, refetchActiveRide]);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    // Map is ready, Google Maps API is now available globally
    if (window.google?.maps) {
      setMapServices(window.google.maps);
    }
  }, []);

  const handlePickupLocationSelect = (location: { address: string; latitude: string; longitude: string }) => {
    setPickupAddress(location.address);
    setPickupLat(location.latitude);
    setPickupLng(location.longitude);

    // Add to recent locations
    addRecentLocationMutation.mutate({
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
    });

    // Calculate route if dropoff is already set
    if (dropoffLat && dropoffLng) {
      calculateRoute(
        { lat: parseFloat(location.latitude), lng: parseFloat(location.longitude) },
        { lat: parseFloat(dropoffLat), lng: parseFloat(dropoffLng) }
      );
    }
  };

  const handleDropoffLocationSelect = (location: { address: string; latitude: string; longitude: string }) => {
    setDropoffAddress(location.address);
    setDropoffLat(location.latitude);
    setDropoffLng(location.longitude);

    // Add to recent locations
    addRecentLocationMutation.mutate({
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
    });

    // Calculate route if pickup is already set
    if (pickupLat && pickupLng) {
      calculateRoute(
        { lat: parseFloat(pickupLat), lng: parseFloat(pickupLng) },
        { lat: parseFloat(location.latitude), lng: parseFloat(location.longitude) }
      );
    }
  };

  const handleCurrentPickupLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          if (!mapServices) {
            toast.error(t('rider.mapServicesNotReady'));
            return;
          }

          try {
            const geocoder = new mapServices.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results: any, status: string) => {
              if (status === "OK" && results && results.length > 0) {
                const address = results[0].formatted_address;
                handlePickupLocationSelect({
                  address,
                  latitude: lat.toString(),
                  longitude: lng.toString(),
                });
                toast.success(t('rider.currentLocationSet'));
              } else {
                toast.error(t('rider.failedToGetAddress'));
              }
            });
          } catch (error) {
            toast.error(t('rider.failedToGetAddress'));
          }
        },
        () => {
          toast.error(t('rider.locationAccessDenied'));
        }
      );
    } else {
      toast.error(t('rider.geolocationNotSupported'));
    }
  };



  const handleCurrentDropoffLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          if (!mapServices) {
            toast.error(t('rider.mapServicesNotReady'));
            return;
          }

          try {
            const geocoder = new mapServices.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results: any, status: string) => {
              if (status === "OK" && results && results.length > 0) {
                const address = results[0].formatted_address;
                handleDropoffLocationSelect({
                  address,
                  latitude: lat.toString(),
                  longitude: lng.toString(),
                });
                toast.success(t('rider.currentLocationSet'));
              } else {
                toast.error(t('rider.failedToGetAddress'));
              }
            });
          } catch (error) {
            toast.error(t('rider.failedToGetAddress'));
          }
        },
        () => {
          toast.error(t('rider.locationAccessDenied'));
        }
      );
    } else {
      toast.error(t('rider.geolocationNotSupported'));
    }
  };



  const calculateRoute = async (origin: any, destination: any) => {
    if (!mapServices) {
      console.warn("Map services not ready");
      return;
    }

    // Validate coordinates
    if (!origin || !destination) {
      console.warn("Invalid origin or destination");
      return;
    }

    // Validate lat/lng values
    const originLat = typeof origin.lat === 'function' ? origin.lat() : origin.lat;
    const originLng = typeof origin.lng === 'function' ? origin.lng() : origin.lng;
    const destLat = typeof destination.lat === 'function' ? destination.lat() : destination.lat;
    const destLng = typeof destination.lng === 'function' ? destination.lng() : destination.lng;

    if (!originLat || !originLng || !destLat || !destLng) {
      console.warn("Invalid coordinates", { originLat, originLng, destLat, destLng });
      return;
    }

    // Check if coordinates are valid numbers
    if (isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng)) {
      console.warn("Coordinates are not valid numbers");
      return;
    }

    try {
      const directionsService = new mapServices.DirectionsService();
      
      // Use callback-based API instead of promise
      directionsService.route(
        {
          origin: new mapServices.LatLng(originLat, originLng),
          destination: new mapServices.LatLng(destLat, destLng),
          travelMode: mapServices.TravelMode.DRIVING,
        },
        (result: any, status: any) => {
          if (status === mapServices.DirectionsStatus.OK && result.routes && result.routes.length > 0) {
            const route = result.routes[0];
            const leg = route.legs[0];
            const distanceInMeters = leg.distance.value;
            const durationInSeconds = leg.duration.value;

            setDistance(distanceInMeters);
            setDuration(durationInSeconds);

            // Calculate fare
            const baseFare = vehicleType === "economy" ? 500 : vehicleType === "comfort" ? 800 : 1200;
            const perKm = vehicleType === "economy" ? 150 : vehicleType === "comfort" ? 200 : 300;
            let fare = baseFare + (distanceInMeters / 1000) * perKm;

            // Apply 20% discount for shared rides
            if (isShared) {
              fare = fare * 0.8;
            }

            setEstimatedFare(Math.round(fare));
          } else {
            console.warn("Route calculation failed:", status);
            // Set default values for estimation
            const straightLineDistance = calculateStraightLineDistance(
              originLat,
              originLng,
              destLat,
              destLng
            );
            setDistance(straightLineDistance);
            setDuration(Math.round(straightLineDistance / 10)); // Rough estimate: 10 m/s average
            
            // Calculate fare based on straight-line distance
            const baseFare = vehicleType === "economy" ? 500 : vehicleType === "comfort" ? 800 : 1200;
            const perKm = vehicleType === "economy" ? 150 : vehicleType === "comfort" ? 200 : 300;
            let fare = baseFare + (straightLineDistance / 1000) * perKm;

            if (isShared) {
              fare = fare * 0.8;
            }

            setEstimatedFare(Math.round(fare));
          }
        }
      );
    } catch (error) {
      console.error("Route calculation error:", error);
      // Fallback to straight-line distance
      const straightLineDistance = calculateStraightLineDistance(
        originLat,
        originLng,
        destLat,
        destLng
      );
      setDistance(straightLineDistance);
      setDuration(Math.round(straightLineDistance / 10));
      
      const baseFare = vehicleType === "economy" ? 500 : vehicleType === "comfort" ? 800 : 1200;
      const perKm = vehicleType === "economy" ? 150 : vehicleType === "comfort" ? 200 : 300;
      let fare = baseFare + (straightLineDistance / 1000) * perKm;

      if (isShared) {
        fare = fare * 0.8;
      }

      setEstimatedFare(Math.round(fare));
    }
  };

  // Helper function to calculate straight-line distance (Haversine formula)
  const calculateStraightLineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
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

  const handleFindSharedRides = async () => {
    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      toast.error(t('rider.selectBothLocations'));
      return;
    }

    const result = await refetchSharedRides();
    if (result.data && result.data.length > 0) {
      setShowCompatibleRides(true);
      toast.success(`Found ${result.data.length} compatible shared rides`);
    } else {
      toast.info("No compatible shared rides found. Creating a new ride...");
      setShowCompatibleRides(false);
    }
  };

  const handleJoinSharedRide = (rideId: number) => {
    if (!estimatedFare) {
      toast.error("Fare not calculated");
      return;
    }

    joinSharedRideMutation.mutate({
      rideId,
      pickupAddress,
      pickupLatitude: pickupLat,
      pickupLongitude: pickupLng,
      dropoffAddress,
      dropoffLatitude: dropoffLat,
      dropoffLongitude: dropoffLng,
      fare: estimatedFare,
    });
  };

  const handleRequestRide = async () => {
    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      toast.error(t('rider.selectBothLocations'));
      return;
    }

    if (!distance) {
      toast.error(t('rider.waitForRoute'));
      return;
    }

    requestRideMutation.mutate({
      pickupAddress,
      pickupLatitude: pickupLat,
      pickupLongitude: pickupLng,
      dropoffAddress,
      dropoffLatitude: dropoffLat,
      dropoffLongitude: dropoffLng,
      vehicleType,
      estimatedFare: estimatedFare || 0,
      distance: distance || undefined,
      duration: duration || undefined,
      isShared,
      maxPassengers: isShared ? 4 : 1,
    });
  };

  const handleSavePickupLocation = () => {
    if (!saveLocationLabel.trim()) {
      toast.error(t('common.error'));
      return;
    }

    addSavedLocationMutation.mutate({
      label: saveLocationLabel,
      address: pickupAddress,
      latitude: pickupLat,
      longitude: pickupLng,
    });
  };

  const cancelRideMutation = trpc.rider.cancelRide.useMutation({
    onSuccess: () => {
      toast.success("Ride cancelled");
      refetchActiveRide();
    },
  });

  // Show live tracking if there's an active ride
  if (activeRide) {
    return (
      <LiveRideTracking
        ride={activeRide}
        onCancel={async () => {
          if (activeRide.id) {
            await cancelRideMutation.mutateAsync({ rideId: activeRide.id });
          }
        }}
      />
    );
  }

  const handleSaveDropoffLocation = () => {
    if (!saveLocationLabel.trim()) {
      toast.error(t('common.error'));
      return;
    }

    addSavedLocationMutation.mutate({
      label: saveLocationLabel,
      address: dropoffAddress,
      latitude: dropoffLat,
      longitude: dropoffLng,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t('rider.requestRide')}</h1>
          <p className="text-muted-foreground">{t('rider.bookRide')}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Booking Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('rider.rideDetails')}</CardTitle>
                <CardDescription>{t('rider.enterLocations')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pickup Location */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t('rider.pickupLocation')}</Label>
                    {pickupLat && pickupLng && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSavePickupDialog(true)}
                        className="h-7 text-xs"
                      >
                        <Star className="h-3 w-3 mr-1" />
                        {t('rider.saveLocation')}
                      </Button>
                    )}
                  </div>
          <LocationSearchInput
            value={pickupAddress}
            onChange={setPickupAddress}
            onLocationSelect={handlePickupLocationSelect}
            placeholder={t('rider.enterPickup')}
            savedLocations={savedLocations}
            recentLocations={recentLocations}
            mapServices={mapServices}
            onCurrentLocation={handleCurrentPickupLocation}
            key="pickup"
          />
                </div>

                {/* Dropoff Location */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t('rider.dropoffLocation')}</Label>
                    {dropoffLat && dropoffLng && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSaveDropoffDialog(true)}
                        className="h-7 text-xs"
                      >
                        <Star className="h-3 w-3 mr-1" />
                        {t('rider.saveLocation')}
                      </Button>
                    )}
                  </div>
          <LocationSearchInput
            value={dropoffAddress}
            onChange={setDropoffAddress}
            onLocationSelect={handleDropoffLocationSelect}
            placeholder={t('rider.enterDropoff')}
            savedLocations={savedLocations}
            recentLocations={recentLocations}
            mapServices={mapServices}
            onCurrentLocation={handleCurrentDropoffLocation}
            key="dropoff"
          />
                </div>

                {/* Vehicle Type */}
                <div className="space-y-2">
                  <Label>{t('rider.vehicleType')}</Label>
                  <Select value={vehicleType} onValueChange={(v: any) => setVehicleType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="economy">{t('rider.economy')} - $1.50/km</SelectItem>
                      <SelectItem value="comfort">{t('rider.comfort')} - $2.00/km</SelectItem>
                      <SelectItem value="premium">{t('rider.premium')} - $3.00/km</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Shared Ride Option */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="shared"
                    checked={isShared}
                    onCheckedChange={(checked) => setIsShared(checked as boolean)}
                  />
                  <Label htmlFor="shared" className="cursor-pointer">
                    {t('rider.sharedRide')}
                  </Label>
                </div>

                {/* Estimated Fare */}
                {estimatedFare !== null && (
                  <Card className="bg-muted">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{t('rider.estimatedFare')}</p>
                          <p className="text-2xl font-bold">${(estimatedFare / 100).toFixed(2)}</p>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          {distance && <p>{(distance / 1000).toFixed(1)} km</p>}
                          {duration && <p>~{Math.round(duration / 60)} min</p>}
                        </div>
                      </div>
                      {isShared && (
                        <Badge variant="secondary" className="mt-2">
                          <Users className="h-3 w-3 mr-1" />
                          {t('rider.discountApplied')}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                {isShared ? (
                  <Button
                    onClick={handleFindSharedRides}
                    disabled={!pickupLat || !dropoffLat}
                    className="w-full"
                    size="lg"
                  >
                    {t('rider.findSharedRides')}
                  </Button>
                ) : (
                  <Button
                    onClick={handleRequestRide}
                    disabled={!pickupLat || !dropoffLat || requestRideMutation.isPending || !!activeRide}
                    className="w-full"
                    size="lg"
                  >
                    {requestRideMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {activeRide ? "You have an active ride" : t('rider.requestRideBtn')}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Compatible Shared Rides */}
            {showCompatibleRides && sharedRidesData && sharedRidesData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('rider.availableSharedRides')}</CardTitle>
                  <CardDescription>{t('rider.joinExistingRide')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sharedRidesData.map((ride) => (
                    <Card key={ride.id} className="border">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary">
                              <Users className="h-3 w-3 mr-1" />
                              {ride.currentPassengers}/{ride.maxPassengers} {t('rider.passengers')}
                            </Badge>
                            <p className="font-bold">${(estimatedFare! / 100).toFixed(2)}</p>
                          </div>
                          <div className="text-sm space-y-1">
                            <div className="flex items-start gap-2">
                              <MapPin className="h-3 w-3 mt-0.5 text-green-600" />
                              <p className="text-muted-foreground truncate">{ride.pickupAddress}</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <Navigation className="h-3 w-3 mt-0.5 text-red-600" />
                              <p className="text-muted-foreground truncate">{ride.dropoffAddress}</p>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleJoinSharedRide(ride.id)}
                            size="sm"
                            className="w-full"
                            disabled={joinSharedRideMutation.isPending}
                          >
                            {t('rider.joinThisRide')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Button
                    onClick={handleRequestRide}
                    variant="outline"
                    className="w-full"
                    disabled={requestRideMutation.isPending}
                  >
                    {t('rider.createNewSharedRide')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Map */}
          <Card className="h-[600px]">
            <CardContent className="p-0 h-full">
              <MapView onMapReady={handleMapReady} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save Pickup Location Dialog */}
      <Dialog open={showSavePickupDialog} onOpenChange={setShowSavePickupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('rider.savePickupLocation')}</DialogTitle>
            <DialogDescription>{t('rider.locationNamePlaceholder')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('rider.locationName')}</Label>
              <Input
                placeholder={t('rider.locationNamePlaceholder')}
                value={saveLocationLabel}
                onChange={(e) => setSaveLocationLabel(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">{pickupAddress}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSavePickupDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSavePickupLocation} disabled={addSavedLocationMutation.isPending}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Dropoff Location Dialog */}
      <Dialog open={showSaveDropoffDialog} onOpenChange={setShowSaveDropoffDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('rider.saveDropoffLocation')}</DialogTitle>
            <DialogDescription>{t('rider.locationNamePlaceholder')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('rider.locationName')}</Label>
              <Input
                placeholder={t('rider.locationNamePlaceholder')}
                value={saveLocationLabel}
                onChange={(e) => setSaveLocationLabel(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">{dropoffAddress}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDropoffDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveDropoffLocation} disabled={addSavedLocationMutation.isPending}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
