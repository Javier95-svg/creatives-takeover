import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Navigation, Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface LocationData {
  address: string;
  coordinates?: {
    lng: number;
    lat: number;
  };
}

interface LocationSuggestion {
  id: string;
  place_name: string;
  center: [number, number];
  place_type: string[];
}

interface LocationSearchInputProps {
  value: string;
  onChange: (location: string, locationData?: LocationData) => void;
  disabled?: boolean;
  placeholder?: string;
}

const LocationSearchInput: React.FC<LocationSearchInputProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = "📍 Search for a location or use GPS"
}) => {
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchValue, setSearchValue] = useState(value);
  const [showMap, setShowMap] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const debounceTimer = useRef<number | undefined>(undefined);

  const [mapboxToken] = useState<string>('pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw');

  useEffect(() => {
    mapboxgl.accessToken = mapboxToken;
  }, [mapboxToken]);

  const searchLocations = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      console.log('Searching for location:', query);
      
      const response = await fetch(
        `https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/location-search?q=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjamxheWJqbm96cWJzb3h6Ym9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NDM4MzQsImV4cCI6MjA3MTExOTgzNH0.mDo9bIJKgEYqEKkVzHawTw9eefIq3BzrywmwztBhzng`,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Search results:', data);
      setSuggestions(data.features || []);
      setShowSuggestions(true);
      
      if (data.features && data.features.length === 0) {
        toast.info('No locations found. Try a different search term.');
      }
    } catch (error) {
      console.error('Location search error:', error);
      toast.error('Failed to search locations. Please try again.');
      setSuggestions([]);
    }
    
    setIsSearching(false);
  }, []);

  const debouncedSearch = useCallback((query: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = window.setTimeout(() => {
      searchLocations(query);
    }, 300);
  }, [searchLocations]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchValue(newValue);
    
    if (newValue.trim()) {
      debouncedSearch(newValue);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion: LocationSuggestion) => {
    const locationData: LocationData = {
      address: suggestion.place_name,
      coordinates: {
        lng: suggestion.center[0],
        lat: suggestion.center[1],
      },
    };

    setSearchValue(suggestion.place_name);
    setSelectedLocation(locationData);
    setShowSuggestions(false);
    setSuggestions([]);
    onChange(suggestion.place_name, locationData);
    
    // Show map with selected location
    if (mapboxToken && suggestion.center) {
      setShowMap(true);
      setTimeout(() => initializeMap(suggestion.center[1], suggestion.center[0]), 100);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser.');
      return;
    }

    setIsGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          console.log('Getting location details for:', latitude, longitude);
          
          const response = await fetch(
            `https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/location-search?lng=${longitude}&lat=${latitude}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjamxheWJqbm96cWJzb3h6Ym9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NDM4MzQsImV4cCI6MjA3MTExOTgzNH0.mDo9bIJKgEYqEKkVzHawTw9eefIq3BzrywmwztBhzng`,
              },
            }
          );
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.features && data.features[0]) {
            const feature = data.features[0];
            const locationData: LocationData = {
              address: feature.place_name,
              coordinates: { lng: longitude, lat: latitude },
            };
            
            setSearchValue(feature.place_name);
            setSelectedLocation(locationData);
            onChange(feature.place_name, locationData);
            
            // Show map with current location
            if (mapboxToken) {
              setShowMap(true);
              setTimeout(() => initializeMap(latitude, longitude), 100);
            }
            
            toast.success('Current location detected!');
            console.log('Location detected:', feature.place_name);
          } else {
            console.warn('No location data found');
            toast.error('Could not determine your location address.');
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error);
          toast.error('Failed to get location details.');
        }
        
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setIsGettingLocation(false);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Location access denied. Please enable location permissions.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Location information unavailable.');
            break;
          case error.TIMEOUT:
            toast.error('Location request timed out.');
            break;
          default:
            toast.error('An error occurred while getting your location.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const initializeMap = (lat: number, lng: number) => {
    if (!mapContainer.current || !mapboxToken) return;

    // Clean up existing map
    if (map.current) {
      map.current.remove();
    }
    
    if (marker.current) {
      marker.current.remove();
    }

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [lng, lat],
        zoom: 13,
        attributionControl: false,
      });

      marker.current = new mapboxgl.Marker({
        color: '#3b82f6',
      })
        .setLngLat([lng, lat])
        .addTo(map.current);

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    } catch (error) {
      console.error('Map initialization error:', error);
      toast.error('Failed to load map preview.');
    }
  };

  const clearLocation = () => {
    setSearchValue('');
    setSelectedLocation(null);
    setShowMap(false);
    setSuggestions([]);
    setShowSuggestions(false);
    onChange('');
    
    if (map.current) {
      map.current.remove();
      map.current = null;
    }
    
    if (marker.current) {
      marker.current.remove();
      marker.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      if (map.current) {
        map.current.remove();
      }
      if (marker.current) {
        marker.current.remove();
      }
    };
  }, []);

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={handleInputChange}
              placeholder={placeholder}
              disabled={disabled}
              className="pl-10 pr-10"
            />
            {searchValue && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                onClick={clearLocation}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={getCurrentLocation}
            disabled={disabled || isGettingLocation}
            className="px-3"
            title="Use current location"
          >
            {isGettingLocation ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Search Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-background shadow-lg">
            <div className="max-h-60 overflow-y-auto p-1">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => selectSuggestion(suggestion)}
                >
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{suggestion.place_name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isSearching && (
          <div className="absolute right-12 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Selected location info */}
      {selectedLocation && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Location selected
          </Badge>
          {selectedLocation.coordinates && (
            <span className="text-xs text-muted-foreground">
              {selectedLocation.coordinates.lat.toFixed(4)}, {selectedLocation.coordinates.lng.toFixed(4)}
            </span>
          )}
        </div>
      )}

      {/* Map Preview */}
      {showMap && mapboxToken && (
        <div className="relative">
          <div
            ref={mapContainer}
            className="h-32 w-full rounded-md border"
            style={{ minHeight: '128px' }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1 h-6 w-6 p-0 bg-background/80 hover:bg-background"
            onClick={() => setShowMap(false)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Character count */}
      <div className="text-xs text-muted-foreground text-right">
        {searchValue.length}/100
      </div>
    </div>
  );
};

export default LocationSearchInput;