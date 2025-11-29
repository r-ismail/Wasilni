import { useState, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MapView } from "@/components/Map";
import { Loader2, MapPin, Navigation } from "lucide-react";
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
  const [compatibleRides, setCompatibleRides] = useState<any[]>([]);
  const [estimatedFare, setEstimatedFare] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [mapServices, setMapServices] = useState<any>(null);

  const { data: sharedRidesData, refetch: refetchSharedRides } = trpc.rider.findSharedRides.useQuery(
    {
      pickupLatitude: pickupLat,
      pickupLongitude: pickupLng,
      dropoffLatitude: dropoffLat,
      dropoffLongitude: dropoffLng,
      vehicleType,
    },
    {
      enabled: false, // Only fetch when user searches
    }
  );

  const joinSharedRideMutation = trpc.rider.joinSharedRide.useMutation({
    onSuccess: () => {
      toast.success("Successfully joined shared ride!");
      setShowCompatibleRides(false);
      // Reset form
      setPickupAddress("");
      setPickupLat("");
      setPickupLng("");
      setDropoffAddress("");
      setDropoffLat("");
      setDropoffLng("");
      setEstimatedFare(null);
      setDistance(null);
      setDuration(null);
    },
    onError: (error) => {
      toast.error(`Failed to join ride: ${error.message}`);
    },
  });

  const requestRideMutation = trpc.rider.requestRide.useMutation({
    onSuccess: (data) => {
      toast.success("Ride requested successfully! Searching for drivers...");
      // Reset form
      setPickupAddress("");
      setPickupLat("");
      setPickupLng("");
      setDropoffAddress("");
      setDropoffLat("");
      setDropoffLng("");
      setEstimatedFare(null);
      setDistance(null);
      setDuration(null);
    },
    onError: (error) => {
      toast.error(`Failed to request ride: ${error.message}`);
    },
  });

  const handleMapReady = useCallback((services: any) => {
    setMapServices(services);
  }, []);

  const handlePickupSearch = async () => {
    if (!mapServices || !pickupAddress) return;

    try {
      const geocoder = new mapServices.Geocoder();
      const result = await geocoder.geocode({ address: pickupAddress });
      
      if (result.results && result.results.length > 0) {
        const location = result.results[0].geometry.location;
        setPickupLat(location.lat().toString());
        setPickupLng(location.lng().toString());
        setPickupAddress(result.results[0].formatted_address);
        toast.success("Pickup location found");
      } else {
        toast.error("Location not found");
      }
    } catch (error) {
      toast.error("Failed to geocode address");
    }
  };

  const handleDropoffSearch = async () => {
    if (!mapServices || !dropoffAddress) return;

    try {
      const geocoder = new mapServices.Geocoder();
      const result = await geocoder.geocode({ address: dropoffAddress });
      
      if (result.results && result.results.length > 0) {
        const location = result.results[0].geometry.location;
        setDropoffLat(location.lat().toString());
        setDropoffLng(location.lng().toString());
        setDropoffAddress(result.results[0].formatted_address);
        toast.success("Dropoff location found");
        
        // Calculate route if both locations are set
        if (pickupLat && pickupLng) {
          calculateRoute(
            { lat: parseFloat(pickupLat), lng: parseFloat(pickupLng) },
            { lat: location.lat(), lng: location.lng() }
          );
        }
      } else {
        toast.error("Location not found");
      }
    } catch (error) {
      toast.error("Failed to geocode address");
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
        
        const distanceMeters = leg.distance.value;
        const durationSeconds = leg.duration.value;
        
        setDistance(distanceMeters);
        setDuration(durationSeconds);
        
        // Fare will be calculated when user clicks request button
      }
    } catch (error) {
      toast.error("Failed to calculate route");
    }
  };

  const handleSearchSharedRides = async () => {
    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      toast.error("Please select both pickup and dropoff locations");
      return;
    }

    const result = await refetchSharedRides();
    if (result.data && result.data.length > 0) {
      setCompatibleRides(result.data);
      setShowCompatibleRides(true);
      toast.success(`Found ${result.data.length} compatible shared rides`);
    } else {
      toast.info("No compatible shared rides found. Creating a new shared ride...");
      handleRequestRide();
    }
  };

  const handleJoinRide = (rideId: number, rideFare: number) => {
    if (!estimatedFare) {
      toast.error("Please wait for fare calculation");
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
      fare: estimatedFare, // Individual fare with discount
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

    // Calculate fare with shared discount if applicable
    try {
      const fareCalc = await fetch(`/api/trpc/common.calculateFare?input=${encodeURIComponent(JSON.stringify({
        distance,
        vehicleType,
        isShared,
      }))}`);
      const fareData = await fareCalc.json();
      const calculatedFare = fareData.result?.data?.estimatedFare || estimatedFare || 0;
      
      requestRideMutation.mutate({
        pickupAddress,
        pickupLatitude: pickupLat,
        pickupLongitude: pickupLng,
        dropoffAddress,
        dropoffLatitude: dropoffLat,
        dropoffLongitude: dropoffLng,
        vehicleType,
        estimatedFare: calculatedFare,
        distance: distance || undefined,
        duration: duration || undefined,
        isShared,
        maxPassengers: isShared ? 4 : 1,
      });
    } catch (error) {
      toast.error("Failed to calculate fare");
    }
  };



  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Request a Ride</h1>
          <p className="text-muted-foreground">Book your ride in seconds</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Booking Form */}
          <Card>
            <CardHeader>
              <CardTitle>Ride Details</CardTitle>
              <CardDescription>Enter your pickup and dropoff locations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pickup Location */}
              <div className="space-y-2">
                <Label htmlFor="pickup">Pickup Location</Label>
                <div className="flex gap-2">
                  <Input
                    id="pickup"
                    placeholder="Enter pickup address"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handlePickupSearch()}
                  />
                  <Button onClick={handlePickupSearch} variant="outline" size="icon">
                    <MapPin className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Dropoff Location */}
              <div className="space-y-2">
                <Label htmlFor="dropoff">Dropoff Location</Label>
                <div className="flex gap-2">
                  <Input
                    id="dropoff"
                    placeholder="Enter dropoff address"
                    value={dropoffAddress}
                    onChange={(e) => setDropoffAddress(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleDropoffSearch()}
                  />
                  <Button onClick={handleDropoffSearch} variant="outline" size="icon">
                    <Navigation className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Vehicle Type */}
              <div className="space-y-2">
                <Label htmlFor="vehicleType">Vehicle Type</Label>
                <Select value={vehicleType} onValueChange={(v: any) => setVehicleType(v)}>
                  <SelectTrigger id="vehicleType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="economy">Economy - Affordable rides</SelectItem>
                    <SelectItem value="comfort">Comfort - More space</SelectItem>
                    <SelectItem value="premium">Premium - Luxury experience</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Shared Ride Option */}
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <input
                  type="checkbox"
                  id="isShared"
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                  className="h-4 w-4"
                />
                <div className="flex-1">
                  <Label htmlFor="isShared" className="font-semibold cursor-pointer">
                    Shared Ride (20% off)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Share your ride with others going in the same direction
                  </p>
                </div>
              </div>

              {/* Fare Estimate */}
              {estimatedFare !== null && (
                <Card className="bg-muted">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Estimated Fare</span>
                        <span className="font-bold text-lg">${(estimatedFare / 100).toFixed(2)}</span>
                      </div>
                      {distance && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Distance</span>
                          <span>{(distance / 1000).toFixed(1)} km</span>
                        </div>
                      )}
                      {duration && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Duration</span>
                          <span>{Math.round(duration / 60)} min</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Request Button */}
              {isShared ? (
                <Button
                  onClick={handleSearchSharedRides}
                  disabled={!pickupLat || !dropoffLat || !distance}
                  className="w-full"
                  size="lg"
                >
                  Find Shared Rides
                </Button>
              ) : (
                <Button
                  onClick={handleRequestRide}
                  disabled={requestRideMutation.isPending || !pickupLat || !dropoffLat || !distance}
                  className="w-full"
                  size="lg"
                >
                  {requestRideMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Request Ride
                </Button>
              )}

              {/* Compatible Rides List */}
              {showCompatibleRides && compatibleRides.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Available Shared Rides</h3>
                  {compatibleRides.map((ride) => (
                    <Card key={ride.id} className="border-2">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium">Ride #{ride.id}</p>
                              <p className="text-xs text-muted-foreground">
                                {ride.currentPassengers}/{ride.maxPassengers} passengers
                              </p>
                            </div>
                            <Badge variant="outline">{ride.vehicleType}</Badge>
                          </div>
                          <div className="text-sm">
                            <p className="text-muted-foreground">From: {ride.pickupAddress}</p>
                            <p className="text-muted-foreground">To: {ride.dropoffAddress}</p>
                          </div>
                          <Button
                            onClick={() => handleJoinRide(ride.id, ride.estimatedFare)}
                            disabled={joinSharedRideMutation.isPending}
                            size="sm"
                            className="w-full"
                          >
                            Join Ride - ${((estimatedFare || 0) / 100).toFixed(2)}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Map */}
          <Card>
            <CardContent className="p-0 h-[600px]">
              <MapView onMapReady={handleMapReady} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
