import { useEffect, useState, useRef } from "react";
import { MapView } from "./Map";
import { useSocket } from "@/contexts/SocketContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "./ui/card";
import { Star, Navigation } from "lucide-react";

interface Driver {
  id: number;
  name: string | null;
  latitude: number;
  longitude: number;
  averageRating: number;
}

interface RealTimeDriverMapProps {
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  onServicesReady?: (services: any) => void;
  pickupLocation?: { lat: number; lng: number };
  dropoffLocation?: { lat: number; lng: number };
}

export function RealTimeDriverMap({
  initialCenter = { lat: 15.5527, lng: 48.5164 }, // Sana'a, Yemen
  initialZoom = 13,
  onServicesReady,
  pickupLocation,
  dropoffLocation,
}: RealTimeDriverMapProps) {
  const { socket, isConnected } = useSocket();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapServices, setMapServices] = useState<any>(null);
  const driverMarkersRef = useRef<Map<number, google.maps.Marker>>(new Map());
  const pickupMarkerRef = useRef<google.maps.Marker | null>(null);
  const dropoffMarkerRef = useRef<google.maps.Marker | null>(null);

  // Fetch initial driver locations
  const { data: availableDrivers } = trpc.common.getAvailableDrivers.useQuery(undefined, {
    refetchInterval: 10000, // Refetch every 10 seconds as fallback
  });

  // Initialize drivers from initial fetch
  useEffect(() => {
    if (availableDrivers) {
      setDrivers(availableDrivers);
    }
  }, [availableDrivers]);

  // Listen for real-time driver location updates via WebSocket
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleDriverLocationUpdate = (data: {
      driverId: number;
      latitude: number;
      longitude: number;
    }) => {
      setDrivers((prev) => {
        const existing = prev.find((d) => d.id === data.driverId);
        if (existing) {
          // Update existing driver
          return prev.map((d) =>
            d.id === data.driverId
              ? { ...d, latitude: data.latitude, longitude: data.longitude }
              : d
          );
        } else {
          // Add new driver (fetch full info from server if needed)
          return prev;
        }
      });
    };

    socket.on("driver:location:update", handleDriverLocationUpdate);

    return () => {
      socket.off("driver:location:update", handleDriverLocationUpdate);
    };
  }, [socket, isConnected]);

  // Update driver markers on map
  useEffect(() => {
    if (!map || !mapServices) return;

    // Create/update markers for each driver
    drivers.forEach((driver) => {
      const existingMarker = driverMarkersRef.current.get(driver.id);

      if (existingMarker) {
        // Animate marker to new position
        const newPosition = new google.maps.LatLng(driver.latitude, driver.longitude);
        animateMarker(existingMarker, newPosition);
      } else {
        // Create new marker
        const marker = new google.maps.Marker({
          position: { lat: driver.latitude, lng: driver.longitude },
          map: map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#10b981",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          title: driver.name || `Driver ${driver.id}`,
        });

        // Add info window
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <div style="font-weight: 600; margin-bottom: 4px;">${driver.name || `Driver ${driver.id}`}</div>
              <div style="display: flex; align-items: center; gap: 4px; font-size: 14px;">
                <span>⭐</span>
                <span>${driver.averageRating.toFixed(1)}</span>
              </div>
            </div>
          `,
        });

        marker.addListener("click", () => {
          infoWindow.open(map, marker);
        });

        driverMarkersRef.current.set(driver.id, marker);
      }
    });

    // Remove markers for drivers no longer available
    const currentDriverIds = new Set(drivers.map((d) => d.id));
    driverMarkersRef.current.forEach((marker, driverId) => {
      if (!currentDriverIds.has(driverId)) {
        marker.setMap(null);
        driverMarkersRef.current.delete(driverId);
      }
    });
  }, [drivers, map, mapServices]);

  // Update pickup marker
  useEffect(() => {
    if (!map || !pickupLocation) return;

    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.setPosition(pickupLocation);
    } else {
      pickupMarkerRef.current = new google.maps.Marker({
        position: pickupLocation,
        map: map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#3b82f6",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
        title: "Pickup Location",
      });
    }
  }, [map, pickupLocation]);

  // Update dropoff marker
  useEffect(() => {
    if (!map || !dropoffLocation) return;

    if (dropoffMarkerRef.current) {
      dropoffMarkerRef.current.setPosition(dropoffLocation);
    } else {
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
  }, [map, dropoffLocation]);

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

  const handleMapReady = (map: google.maps.Map) => {
    setMap(map);
    setMapServices(window.google?.maps || null);
    if (onServicesReady && window.google?.maps) {
      onServicesReady(window.google.maps);
    }
  };

  return (
    <div className="relative">
      <MapView
        initialCenter={initialCenter}
        initialZoom={initialZoom}
        onMapReady={handleMapReady}
      />
      
      {/* Driver count indicator */}
      <Card className="absolute top-4 left-4 z-10">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">
              {drivers.length} {drivers.length === 1 ? "driver" : "drivers"} nearby
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Connection status */}
      {!isConnected && (
        <Card className="absolute top-4 right-4 z-10 bg-yellow-50 border-yellow-200">
          <CardContent className="p-3">
            <span className="text-sm text-yellow-800">Reconnecting...</span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
