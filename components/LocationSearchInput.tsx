// components/LocationSearchInput.tsx (Free Version)
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, Navigation, Map } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';

// Define our location interface
interface RideLocation {
  lat: number;
  lng: number;
  address: string;
  place_id?: string;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
  type: string;
  importance: number;
}

interface LocationSearchInputProps {
  label: string;
  placeholder: string;
  onLocationSelect: (location: RideLocation | null) => void;
  selectedLocation: RideLocation | null;
  iconColor: string;
  value: string;
  onChange: (value: string) => void;
}

// Declare Leaflet types
declare global {
  interface Window {
    L: any;
  }
}

// Free OpenStreetMap Selector Component
const OpenStreetMapSelector = ({ 
  onLocationSelect, 
  initialLocation,
  isOpen,
  onClose 
}: {
  onLocationSelect: (location: RideLocation) => void;
  initialLocation?: RideLocation; // This expects RideLocation | undefined
  isOpen: boolean;
  onClose: () => void;
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [selectedMapLocation, setSelectedMapLocation] = useState<RideLocation | null>(initialLocation || null);
  const [isLoading, setIsLoading] = useState(true);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Load Leaflet dynamically
  useEffect(() => {
    if (!isOpen) return;

    const loadLeaflet = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (window.L) {
          setLeafletLoaded(true);
          return resolve();
        }

        // Load CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        document.head.appendChild(link);

        // Load JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';
        script.onload = () => {
          setLeafletLoaded(true);
          resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    loadLeaflet().catch(error => {
      console.error('Failed to load Leaflet:', error);
      setIsLoading(false);
    });

    return () => {
      // Cleanup map when component unmounts
      cleanupMap();
    };
  }, [isOpen]);

  const cleanupMap = useCallback(() => {
    if (markerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
  }, []);

  // Initialize map when Leaflet is loaded and isOpen changes
  useEffect(() => {
    if (!isOpen || !leafletLoaded || !mapRef.current) {
      cleanupMap();
      return;
    }

    const initializeMap = async () => {
      try {
        // Clean up existing map first
        cleanupMap();
        
        setIsLoading(true);
        const defaultCenter = initialLocation || { lat: 6.9271, lng: 79.8612 }; // Colombo, Sri Lanka
        
        // Initialize map
        const map = window.L.map(mapRef.current!).setView([defaultCenter.lat, defaultCenter.lng], 13);
        
        // Add OpenStreetMap tiles (free)
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;

        // Add initial marker if location exists
        if (initialLocation) {
          const marker = window.L.marker([initialLocation.lat, initialLocation.lng])
            .addTo(map)
            .bindPopup('Selected Location')
            .openPopup();
          markerRef.current = marker;
          setSelectedMapLocation(initialLocation);
        }

        // Handle map clicks
        map.on('click', async (e: any) => {
          const lat = e.latlng.lat;
          const lng = e.latlng.lng;

          // Remove existing marker
          if (markerRef.current) {
            map.removeLayer(markerRef.current);
          }

          // Add new marker
          const marker = window.L.marker([lat, lng])
            .addTo(map)
            .bindPopup('Selected Location')
            .openPopup();
          
          markerRef.current = marker;
          
          // Reverse geocode
          await reverseGeocode(lat, lng);
        });

        setIsLoading(false);
      } catch (error) {
        console.error('Map initialization error:', error);
        setIsLoading(false);
      }
    };

    initializeMap();

    // Cleanup on unmount or when dependencies change
    return () => {
      cleanupMap();
    };
  }, [isOpen, leafletLoaded, initialLocation, cleanupMap]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'RouteManagementSystem/1.0',
            'Accept-Language': 'en-US,en;q=0.9',
          }
        }
      );
      
      if (!response.ok) throw new Error('Reverse geocoding failed');
      
      const data = await response.json();
      if (data.display_name) {
        const newLocation: RideLocation = {
          lat,
          lng,
          address: data.display_name,
          place_id: data.place_id
        };
        setSelectedMapLocation(newLocation);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      // Fallback address
      setSelectedMapLocation({
        lat,
        lng,
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      });
    }
  };

  const handleConfirm = () => {
    if (selectedMapLocation) {
      onLocationSelect(selectedMapLocation);
      onClose();
      cleanupMap();
    }
  };

  const handleCancel = () => {
    onClose();
    cleanupMap();
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div 
          ref={mapRef} 
          className="w-full h-96 rounded-lg border-2 border-gray-200 bg-gray-100"
        />
        {isLoading && (
          <div className="absolute inset-0 bg-gray-100/90 rounded-lg flex items-center justify-center z-10">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
      </div>

      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
        <p className="font-medium mb-1">How to select location:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Click anywhere on the map to place a marker</li>
          <li>The address will be automatically detected</li>
          <li>Drag the marker to reposition it</li>
          <li>Powered by OpenStreetMap (free)</li>
        </ul>
      </div>

      {selectedMapLocation && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-green-800 mb-1">Selected Location</p>
              <p className="text-sm text-green-700 break-words">{selectedMapLocation.address}</p>
              <p className="text-xs text-green-600 font-mono mt-1">
                {selectedMapLocation.lat.toFixed(6)}, {selectedMapLocation.lng.toFixed(6)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button 
          onClick={handleCancel} 
          variant="outline" 
          className="flex-1"
          type="button"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleConfirm} 
          disabled={!selectedMapLocation}
          className="flex-1"
          type="button"
        >
          Confirm Location
        </Button>
      </div>
    </div>
  );
};

export default function LocationSearchInput({ 
  label, 
  placeholder, 
  onLocationSelect, 
  selectedLocation,
  iconColor = '#3B82F6',
  value,
  onChange
}: LocationSearchInputProps) {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showMapSelector, setShowMapSelector] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const searchLocations = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      // Using Nominatim API for geocoding (free)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=lk&addressdetails=1&bounded=1&viewbox=79.5,5.5,81.5,10.5`,
        {
          headers: {
            'User-Agent': 'RouteManagementSystem/1.0',
            'Accept-Language': 'en-US,en;q=0.9',
          }
        }
      );
      
      if (response.ok) {
        const data: SearchResult[] = await response.json();
        // Sort by importance and filter relevant results
        const sortedResults = data
          .filter(result => result.importance > 0.3)
          .sort((a, b) => b.importance - a.importance);
        setSearchResults(sortedResults);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value && isFocused && !selectedLocation) {
      searchTimeoutRef.current = setTimeout(() => {
        searchLocations(value);
      }, 300);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [value, isFocused, selectedLocation]);

  const handleLocationSelect = (result: SearchResult) => {
    const location: RideLocation = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      address: result.display_name.split(',').slice(0, 3).join(',').trim(),
      place_id: result.place_id
    };
    
    onLocationSelect(location);
    onChange(location.address);
    setShowResults(false);
    setIsFocused(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    if (selectedLocation && newValue !== selectedLocation.address) {
      onLocationSelect(null);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (value && !selectedLocation) {
      searchLocations(value);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
      setShowResults(false);
    }, 200);
  };

  const handleMapLocationSelect = (location: RideLocation) => {
    onLocationSelect(location);
    onChange(location.address);
    setShowMapSelector(false);
  };

  const handleClearLocation = () => {
    onLocationSelect(null);
    onChange('');
    setShowResults(false);
  };

  return (
    <div className="space-y-2 relative">
      <Label className="text-sm font-medium flex items-center justify-between">
        <span>{label}</span>
        {selectedLocation && (
          <button
            type="button"
            onClick={handleClearLocation}
            className="text-xs text-red-500 hover:text-red-700 hover:underline"
          >
            Clear
          </button>
        )}
      </Label>
      
      {/* Search Input */}
      <div className="relative">
        <MapPin 
          className={`absolute left-3 top-3 w-4 h-4 z-10`} 
          style={{ color: selectedLocation ? iconColor : '#9CA3AF' }} 
        />
        <Input
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`pl-10 pr-10 transition-all duration-300 focus:ring-2 focus:ring-blue-500 ${
            selectedLocation ? 'border-green-300 bg-green-50' : ''
          }`}
          aria-label={label}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-gray-400" />
        )}
        {selectedLocation && (
          <Navigation className="absolute right-3 top-3 w-4 h-4 text-green-500" />
        )}
      </div>

      {/* Map Selector Button */}
      <Dialog open={showMapSelector} onOpenChange={setShowMapSelector}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full" type="button">
            <Map className="w-4 h-4 mr-2" />
            Select on Map (Free)
          </Button>
        </DialogTrigger>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          aria-describedby="map-dialog-description"
        >
          <DialogHeader>
            <DialogTitle>Select Location on Map</DialogTitle>
            <DialogDescription id="map-dialog-description">
              Click on the map to select a location. The address will be automatically detected.
            </DialogDescription>
          </DialogHeader>
          {/* FIX: Convert selectedLocation (which can be null) to undefined */}
          <OpenStreetMapSelector
            onLocationSelect={handleMapLocationSelect}
            initialLocation={selectedLocation || undefined} // Convert null to undefined
            isOpen={showMapSelector}
            onClose={() => setShowMapSelector(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Search Results */}
      {showResults && searchResults.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto shadow-lg border-2 border-blue-100 top-full">
          <CardContent className="p-0">
            {searchResults.map((result, index) => (
              <button
                key={result.place_id || index}
                onClick={() => handleLocationSelect(result)}
                className="w-full text-left p-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors duration-200 focus:outline-none focus:bg-blue-50 focus:ring-2 focus:ring-blue-300"
                onMouseDown={(e) => e.preventDefault()}
                type="button"
                aria-label={`Select ${result.display_name}`}
              >
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {result.display_name.split(',')[0]}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {result.display_name}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Selected Location Display */}
      {selectedLocation && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: iconColor }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800">Selected Location</p>
              <p className="text-xs text-green-700 break-words">{selectedLocation.address}</p>
              <p className="text-xs text-green-600 font-mono mt-1">
                {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export type { RideLocation };