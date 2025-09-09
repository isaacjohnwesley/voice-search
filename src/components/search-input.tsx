"use client";

import { useState, useRef, useEffect } from "react";
// import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VoiceInputSheet } from "./voice-input-sheet";
import { SearchResultsDropdown } from "./search-results-dropdown";

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

export function SearchInput() {
  const [searchValue, setSearchValue] = useState("");
  const [isVoiceSheetOpen, setIsVoiceSheetOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleMicClick = () => {
    // Clear previous search value for new session
    setSearchValue("");
    setSelectedPlace(null);
    setShowDropdown(false);
    setIsVoiceSheetOpen(true);
  };

  const handleVoiceResult = (transcribedText: string) => {
    setSearchValue(transcribedText);
    setSelectedPlace(null);
    setShowDropdown(true);
    setIsVoiceSheetOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    setSelectedPlace(null);
    setShowDropdown(value.trim().length > 0);
  };

  const handlePlaceSelect = (place: Place) => {
    setSelectedPlace(place);
    setSearchValue(place.name);
    setShowDropdown(false);
    // Here you can add logic to handle the selected place
    console.log('Selected place:', place);
  };

  const handleInputFocus = () => {
    if (searchValue.trim().length > 0) {
      setShowDropdown(true);
    }
  };

  const handleDropdownClose = () => {
    setShowDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <>
      <div className="relative w-full max-w-md mx-auto" ref={inputRef}>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" style={{ fontSize: '16px' }}>
            search
          </span>
          <Input
            ref={inputRef}
            type="text"
            placeholder="Where do you want to go?"
            value={searchValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            className="pl-10 pr-12 h-12 text-base"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMicClick}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-10 w-10 hover:bg-muted mobile-tap"
          >
            <span className="material-symbols-outlined text-muted-foreground" style={{ fontSize: '20px' }}>
              mic
            </span>
          </Button>
        </div>
        
        <SearchResultsDropdown
          query={searchValue}
          isVisible={showDropdown}
          onSelect={handlePlaceSelect}
          onClose={handleDropdownClose}
        />
      </div>

      <VoiceInputSheet
        isOpen={isVoiceSheetOpen}
        onClose={() => setIsVoiceSheetOpen(false)}
        onResult={handleVoiceResult}
      />
    </>
  );
}
