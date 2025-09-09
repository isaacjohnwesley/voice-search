"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, MapPin, Star } from "lucide-react";

interface Place {
  id: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  rating?: number;
  priceLevel?: number;
  types: string[];
}

interface SearchResultsDropdownProps {
  query: string;
  isVisible: boolean;
  onSelect: (place: Place) => void;
  onClose: () => void;
}

export function SearchResultsDropdown({ 
  query, 
  isVisible, 
  onSelect, 
  onClose 
}: SearchResultsDropdownProps) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search effect
  useEffect(() => {
    if (!query.trim() || !isVisible) {
      setPlaces([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/places?query=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch places');
        }

        const data = await response.json();
        setPlaces(data.places || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to search places');
        setPlaces([]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [query, isVisible]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);

  if (!isVisible || !query.trim()) {
    return null;
  }

  const formatPriceLevel = (level?: number) => {
    if (level === undefined) return '';
    return '$'.repeat(level);
  };

  const getPlaceType = (types: string[]) => {
    // Filter out generic types and return the most relevant one
    const relevantTypes = types.filter(type => 
      !['establishment', 'point_of_interest', 'geocode'].includes(type)
    );
    return relevantTypes[0] || types[0] || 'location';
  };

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
    >
      {isLoading ? (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Searching places...</span>
        </div>
      ) : error ? (
        <div className="p-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : places.length === 0 ? (
        <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground">No places found for &ldquo;{query}&rdquo;</p>
        </div>
      ) : (
        <div className="py-1">
          {places.map((place) => (
            <button
              key={place.id}
              onClick={() => onSelect(place)}
              className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-sm font-medium text-foreground truncate">
                      {place.name}
                    </h3>
                    {place.rating && (
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                        <span className="text-xs text-muted-foreground">
                          {place.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                    {place.priceLevel && (
                      <span className="text-xs text-muted-foreground">
                        {formatPriceLevel(place.priceLevel)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {place.address}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize mt-1">
                    {getPlaceType(place.types)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
