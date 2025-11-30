import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { MapView } from "./Map";
import { useSocket } from "@/contexts/SocketContext";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Star, Phone, Navigation, Clock, MapPin } from "lucide-react";

interface Driver {
  id: number;
  name: string | null;
  phone: string | null;
  profilePhoto: string | null;
  averageRating: number;
  currentLatitude: number | null;
  currentLongitude: number | null;
}

interface ActiveRide {
  id: number;
  status: string;
  pickupLatitude: string;
  pickupLongitude: string;
  dropoffLatitude: string;
  dropoffLongitude: string;
  pickupAddress: string;
  dropoffAddress: string;
  driver?: Driver;
}

interface LiveRideTrackingProps {
  ride: ActiveRide;
  onCancel?: () => void;
}

export function LiveRideTracking({ ride, onCancel }: LiveRideTrackingProps) {
  const { t } = useTranslation();
  const { socket, isConnected } = useSocket();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [driverPosition, setDriverPosition] = useState<{ lat: number; lng: number } | null>(
    ride.driver?.currentLatitude && ride.driver?.currentLongitude
      ? { lat: ride.driver.currentLatitude, lng: ride.driver.currentLongitude }
      : null
  );
  const [eta, setEta] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [routePolyline, setRoutePolyline] = useState<google.maps.Polyline | null>(null);
  
  const driverMarkerRef = useRef<google.maps.Marker | null>(null);
  const pickupMarkerRef = useRef<google.maps.Marker | null>(null);
  const dropoffMarkerRef = useRef<google.maps.Marker | null>(null);

  const pickupLocation = {
    lat: parseFloat(ride.pickupLatitude),
    lng: parseFloat(ride.pickupLongitude),
  };

  const dropoffLocation = {
    lat: parseFloat(ride.dropoffLatitude),
    lng: parseFloat(ride.dropoffLongitude),
  };

  // Listen for real-time driver location updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const eventName = `ride:${ride.id}:driver:location`;
    
    const handleDriverLocationUpdate = (data: { latitude: number; longitude: number }) => {
      setDriverPosition({ lat: data.latitude, lng: data.longitude });
    };

    socket.on(eventName, handleDriverLocationUpdate);

    return () => {
      socket.off(eventName, handleDriverLocationUpdate);
    };
  }, [socket, isConnected, ride.id]);

  // Update driver marker on map
  useEffect(() => {
    if (!map || !driverPosition) return;

    if (driverMarkerRef.current) {
      // Animate marker to new position
      animateMarker(driverMarkerRef.current, new google.maps.LatLng(driverPosition.lat, driverPosition.lng));
    } else {
      // Create new marker
      driverMarkerRef.current = new google.maps.Marker({
        position: driverPosition,
        map: map,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: "#3b82f6",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          rotation: 0,
        },
        title: ride.driver?.name || "Driver",
      });
    }

    // Center map on driver
    map.panTo(driverPosition);
  }, [map, driverPosition, ride.driver?.name]);

  // Create pickup and dropoff markers
  useEffect(() => {
    if (!map) return;

    if (!pickupMarkerRef.current) {
      pickupMarkerRef.current = new google.maps.Marker({
        position: pickupLocation,
        map: map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#10b981",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
        title: "Pickup Location",
      });
    }

    if (!dropoffMarkerRef.current) {
      dropoffMarkerRef.current = new google.maps.Marker({
        position: dropoffLocation,
        map: map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#ef4444",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
        title: "Dropoff Location",
      });
    }
  }, [map]);

  // Calculate route and ETA
  useEffect(() => {
    if (!map || !driverPosition || !window.google?.maps) return;

    const directionsService = new google.maps.DirectionsService();
    
    const destination = ride.status === "in_progress" ? dropoffLocation : pickupLocation;

    directionsService.route(
      {
        origin: driverPosition,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result) {
          const route = result.routes[0];
          const leg = route.legs[0];

          setEta(leg.duration?.text || null);
          setDistance(leg.distance?.text || null);

          // Draw route polyline
          if (routePolyline) {
            routePolyline.setMap(null);
          }

          const newPolyline = new google.maps.Polyline({
            path: leg.steps.flatMap((step) => step.path),
            geodesic: true,
            strokeColor: "#3b82f6",
            strokeOpacity: 0.8,
            strokeWeight: 4,
            map: map,
          });

          setRoutePolyline(newPolyline);

          // Fit map to show entire route
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(driverPosition);
          bounds.extend(destination);
          map.fitBounds(bounds);
        }
      }
    );
  }, [map, driverPosition, ride.status]);

  // Animate marker movement
  const animateMarker = (marker: google.maps.Marker, newPosition: google.maps.LatLng) => {
    const currentPosition = marker.getPosition();
    if (!currentPosition) return;

    const frames = 30;
    let frame = 0;

    const latDiff = (newPosition.lat() - currentPosition.lat()) / frames;
    const lngDiff = (newPosition.lng() - currentPosition.lng()) / frames;

    const animate = () => {
      if (frame < frames) {
        const lat = currentPosition.lat() + latDiff * frame;
        const lng = currentPosition.lng() + lngDiff * frame;
        marker.setPosition({ lat, lng });
        frame++;
        requestAnimationFrame(animate);
      }
    };

    animate();
  };

  const getStatusBadge = () => {
    switch (ride.status) {
      case "accepted":
        return <Badge className="bg-blue-500">{t("rider.driverOnTheWay")}</Badge>;
      case "driver_arriving":
        return <Badge className="bg-yellow-500">{t("rider.driverArriving")}</Badge>;
      case "arrived":
        return <Badge className="bg-orange-500">{t("rider.driverArrived")}</Badge>;
      case "in_progress":
        return <Badge className="bg-green-500">{t("rider.tripInProgress")}</Badge>;
      default:
        return <Badge>{ride.status}</Badge>;
    }
  };

  const handleMapReady = (mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Map */}
      <div className="flex-1 relative">
        <MapView
          initialCenter={driverPosition || pickupLocation}
          initialZoom={14}
          onMapReady={handleMapReady}
        />

        {/* Status Card */}
        <Card className="absolute top-4 left-4 right-4 z-10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{getStatusBadge()}</CardTitle>
              {!isConnected && (
                <Badge variant="outline" className="bg-yellow-50">
                  {t("common.reconnecting")}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* ETA and Distance */}
            {eta && distance && (
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{eta}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{distance}</span>
                </div>
              </div>
            )}

            {/* Driver Info */}
            {ride.driver && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {ride.driver.name?.charAt(0) || "D"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{ride.driver.name || "Driver"}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>{ride.driver.averageRating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  <Phone className="h-4 w-4 mr-2" />
                  {t("rider.call")}
                </Button>
              </div>
            )}

            {/* Destination */}
            <div className="pt-2 border-t">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-red-500 mt-1" />
                <div className="text-sm">
                  <p className="font-medium">{t("rider.destination")}</p>
                  <p className="text-muted-foreground">{ride.dropoffAddress}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cancel Button */}
      {ride.status === "accepted" && onCancel && (
        <div className="p-4 border-t bg-background">
          <Button
            variant="destructive"
            className="w-full"
            onClick={onCancel}
          >
            {t("rider.cancelRide")}
          </Button>
        </div>
      )}
    </div>
  );
}
