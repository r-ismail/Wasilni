import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Star, Clock, Navigation2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface SavedLocation {
  id: number;
  label: string;
  address: string;
  latitude: string;
  longitude: string;
}

interface RecentLocation {
  id: number;
  address: string;
  latitude: string;
  longitude: string;
}

interface LocationSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect: (location: {
    address: string;
    latitude: string;
    longitude: string;
  }) => void;
  placeholder?: string;
  savedLocations?: SavedLocation[];
  recentLocations?: RecentLocation[];
  mapServices?: any;
  onCurrentLocation?: () => void;
  className?: string;
}

export function LocationSearchInput({
  value,
  onChange,
  onLocationSelect,
  placeholder,
  savedLocations = [],
  recentLocations = [],
  mapServices,
  onCurrentLocation,
  className,
}: LocationSearchInputProps) {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const autocompleteService = useRef<any>(null);
  const placesService = useRef<any>(null);

  useEffect(() => {
    if (mapServices?.places?.AutocompleteService) {
      try {
        autocompleteService.current = new mapServices.places.AutocompleteService();
        // Create a dummy div for PlacesService (it requires a map or div)
        const dummyDiv = document.createElement("div");
        placesService.current = new mapServices.places.PlacesService(dummyDiv);
      } catch (error) {
        console.error("Failed to initialize Google Maps services:", error);
      }
    }
  }, [mapServices]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = async (newValue: string) => {
    onChange(newValue);

    if (!newValue.trim()) {
      setSuggestions([]);
      setShowDropdown(true); // Show saved/recent locations
      return;
    }

    if (!autocompleteService.current) {
      return;
    }

    setIsLoading(true);

    try {
      autocompleteService.current.getPlacePredictions(
        {
          input: newValue,
          types: ["geocode", "establishment"],
        },
        (predictions: any[], status: string) => {
          setIsLoading(false);

          if (status === "OK" && predictions) {
            const formattedSuggestions: LocationSuggestion[] = predictions.map((p) => ({
              placeId: p.place_id,
              description: p.description,
              mainText: p.structured_formatting.main_text,
              secondaryText: p.structured_formatting.secondary_text || "",
            }));
            setSuggestions(formattedSuggestions);
            setShowDropdown(true);
          } else {
            setSuggestions([]);
          }
        }
      );
    } catch (error) {
      console.error("Autocomplete error:", error);
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: LocationSuggestion) => {
    if (!placesService.current) {
      console.warn("Places service not ready");
      return;
    }

    placesService.current.getDetails(
      {
        placeId: suggestion.placeId,
        fields: ["geometry", "formatted_address"],
      },
      (place: any, status: string) => {
        if (status === "OK" && place.geometry) {
          const location = {
            address: place.formatted_address,
            latitude: place.geometry.location.lat().toString(),
            longitude: place.geometry.location.lng().toString(),
          };

          onChange(place.formatted_address);
          onLocationSelect(location);
          setShowDropdown(false);
          setSuggestions([]);
        }
      }
    );
  };

  const handleSavedLocationClick = (location: SavedLocation) => {
    onChange(location.address);
    onLocationSelect({
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
    });
    setShowDropdown(false);
  };

  const handleRecentLocationClick = (location: RecentLocation) => {
    onChange(location.address);
    onLocationSelect({
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
    });
    setShowDropdown(false);
  };

  const handleClear = () => {
    onChange("");
    setSuggestions([]);
    setShowDropdown(true);
    inputRef.current?.focus();
  };

  const showSavedRecent = !value.trim() && (savedLocations.length > 0 || recentLocations.length > 0);

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          className="pl-10 pr-20"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-7 w-7 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          {onCurrentLocation && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCurrentLocation}
              className="h-7 w-7 p-0"
              title="Use current location"
            >
              <Navigation2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {showDropdown && (
        <Card
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 max-h-96 overflow-y-auto shadow-lg"
        >
          <div className="p-2">
            {/* Saved Locations */}
            {showSavedRecent && savedLocations.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-muted-foreground px-2 py-1">
                  {t('rider.savedLocations')}
                </p>
                {savedLocations.map((location) => (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => handleSavedLocationClick(location)}
                    className="w-full text-left px-2 py-2 hover:bg-muted rounded-md flex items-start gap-2"
                  >
                    <Star className="h-4 w-4 mt-0.5 text-yellow-500 fill-yellow-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{location.label}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {location.address}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Recent Locations */}
            {showSavedRecent && recentLocations.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-muted-foreground px-2 py-1">
                  {t('rider.recentLocations')}
                </p>
                {recentLocations.slice(0, 5).map((location) => (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => handleRecentLocationClick(location)}
                    className="w-full text-left px-2 py-2 hover:bg-muted rounded-md flex items-start gap-2"
                  >
                    <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{location.address}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Autocomplete Suggestions */}
            {suggestions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground px-2 py-1">
                  {t('rider.suggestions')}
                </p>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.placeId}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-2 py-2 hover:bg-muted rounded-md flex items-start gap-2"
                  >
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{suggestion.mainText}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {suggestion.secondaryText}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                {t('rider.searching')}
              </div>
            )}

            {/* No Results */}
            {!isLoading && value.trim() && suggestions.length === 0 && (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                {t('rider.noLocationsFound')}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
