import { useState, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
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
      toast.success("Location saved!");
      setShowSavePickupDialog(false);
      setShowSaveDropoffDialog(false);
      setSaveLocationLabel("");
      refetchSavedLocations();
    },
    onError: () => {
      toast.error("Failed to save location");
    },
  });

  const joinSharedRideMutation = trpc.rider.joinSharedRide.useMutation({
    onSuccess: () => {
      toast.success("Successfully joined shared ride!");
      setShowCompatibleRides(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to join ride: ${error.message}`);
    },
  });

  const requestRideMutation = trpc.rider.requestRide.useMutation({
    onSuccess: () => {
      toast.success("Ride requested successfully! Searching for drivers...");
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

  const handleMapReady = useCallback((services: any) => {
    setMapServices(services);
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

          if (!mapServices?.Geocoder) {
            toast.error("Map services not ready");
            return;
          }

          try {
            const geocoder = new mapServices.Geocoder();
            const result = await geocoder.geocode({ location: { lat, lng } });

            if (result.results && result.results.length > 0) {
              const address = result.results[0].formatted_address;
              handlePickupLocationSelect({
                address,
                latitude: lat.toString(),
                longitude: lng.toString(),
              });
              toast.success("Current location set as pickup");
            }
          } catch (error) {
            toast.error("Failed to get address");
          }
        },
        () => {
          toast.error("Location access denied");
        }
      );
    } else {
      toast.error("Geolocation not supported");
    }
  };

  const handleCurrentDropoffLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          if (!mapServices?.Geocoder) {
            toast.error("Map services not ready");
            return;
          }

          try {
            const geocoder = new mapServices.Geocoder();
            const result = await geocoder.geocode({ location: { lat, lng } });

            if (result.results && result.results.length > 0) {
              const address = result.results[0].formatted_address;
              handleDropoffLocationSelect({
                address,
                latitude: lat.toString(),
                longitude: lng.toString(),
              });
              toast.success("Current location set as dropoff");
            }
          } catch (error) {
            toast.error("Failed to get address");
          }
        },
        () => {
          toast.error("Location access denied");
        }
      );
    } else {
      toast.error("Geolocation not supported");
    }
  };

  const calculateRoute = async (origin: any, destination: any) => {
    if (!mapServices) return;

    try {
      const directionsService = new mapServices.DirectionsService();
      const result = await directionsService.route({
        origin,
        destination,
        travelMode: mapServices.TravelMode.DRIVING,
      });

      if (result.routes && result.routes.length > 0) {
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
      }
    } catch (error) {
      console.error("Route calculation error:", error);
    }
  };

  const handleFindSharedRides = async () => {
    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      toast.error("Please select both pickup and dropoff locations");
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
      toast.error("Please select both pickup and dropoff locations");
      return;
    }

    if (!distance) {
      toast.error("Please wait for route calculation");
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
      toast.error("Please enter a label");
      return;
    }

    addSavedLocationMutation.mutate({
      label: saveLocationLabel,
      address: pickupAddress,
      latitude: pickupLat,
      longitude: pickupLng,
    });
  };

  const handleSaveDropoffLocation = () => {
    if (!saveLocationLabel.trim()) {
      toast.error("Please enter a label");
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
          <h1 className="text-3xl font-bold">Request a Ride</h1>
          <p className="text-muted-foreground">Book a ride to your destination</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Booking Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ride Details</CardTitle>
                <CardDescription>Enter your pickup and dropoff locations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pickup Location */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Pickup Location</Label>
                    {pickupLat && pickupLng && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSavePickupDialog(true)}
                        className="h-7 text-xs"
                      >
                        <Star className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                    )}
                  </div>
                  <LocationSearchInput
                    value={pickupAddress}
                    onChange={setPickupAddress}
                    onLocationSelect={handlePickupLocationSelect}
                    placeholder="Enter pickup address"
                    savedLocations={savedLocations}
                    recentLocations={recentLocations}
                    mapServices={mapServices}
                    onCurrentLocation={handleCurrentPickupLocation}
                  />
                </div>

                {/* Dropoff Location */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Dropoff Location</Label>
                    {dropoffLat && dropoffLng && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSaveDropoffDialog(true)}
                        className="h-7 text-xs"
                      >
                        <Star className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                    )}
                  </div>
                  <LocationSearchInput
                    value={dropoffAddress}
                    onChange={setDropoffAddress}
                    onLocationSelect={handleDropoffLocationSelect}
                    placeholder="Enter dropoff address"
                    savedLocations={savedLocations}
                    recentLocations={recentLocations}
                    mapServices={mapServices}
                    onCurrentLocation={handleCurrentDropoffLocation}
                  />
                </div>

                {/* Vehicle Type */}
                <div className="space-y-2">
                  <Label>Vehicle Type</Label>
                  <Select value={vehicleType} onValueChange={(v: any) => setVehicleType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="economy">Economy - $1.50/km</SelectItem>
                      <SelectItem value="comfort">Comfort - $2.00/km</SelectItem>
                      <SelectItem value="premium">Premium - $3.00/km</SelectItem>
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
                    Shared Ride (20% discount)
                  </Label>
                </div>

                {/* Estimated Fare */}
                {estimatedFare !== null && (
                  <Card className="bg-muted">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Estimated Fare</p>
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
                          20% discount applied
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
                    Find Shared Rides
                  </Button>
                ) : (
                  <Button
                    onClick={handleRequestRide}
                    disabled={!pickupLat || !dropoffLat || requestRideMutation.isPending}
                    className="w-full"
                    size="lg"
                  >
                    {requestRideMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Request Ride
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Compatible Shared Rides */}
            {showCompatibleRides && sharedRidesData && sharedRidesData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Available Shared Rides</CardTitle>
                  <CardDescription>Join an existing ride going your way</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sharedRidesData.map((ride) => (
                    <Card key={ride.id} className="border">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary">
                              <Users className="h-3 w-3 mr-1" />
                              {ride.currentPassengers}/{ride.maxPassengers} passengers
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
                            Join This Ride
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
                    Or Create New Shared Ride
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
            <DialogTitle>Save Pickup Location</DialogTitle>
            <DialogDescription>Give this location a name for quick access</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Location Name</Label>
              <Input
                placeholder="e.g., Home, Work, Gym"
                value={saveLocationLabel}
                onChange={(e) => setSaveLocationLabel(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">{pickupAddress}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSavePickupDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePickupLocation} disabled={addSavedLocationMutation.isPending}>
              Save Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Dropoff Location Dialog */}
      <Dialog open={showSaveDropoffDialog} onOpenChange={setShowSaveDropoffDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Dropoff Location</DialogTitle>
            <DialogDescription>Give this location a name for quick access</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Location Name</Label>
              <Input
                placeholder="e.g., Home, Work, Gym"
                value={saveLocationLabel}
                onChange={(e) => setSaveLocationLabel(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">{dropoffAddress}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDropoffDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDropoffLocation} disabled={addSavedLocationMutation.isPending}>
              Save Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
