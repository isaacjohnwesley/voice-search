"use client";

import { useState } from "react";
import { Search, Mic } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VoiceInputSheet } from "./voice-input-sheet";

export function SearchInput() {
  const [searchValue, setSearchValue] = useState("");
  const [isVoiceSheetOpen, setIsVoiceSheetOpen] = useState(false);

  const handleMicClick = () => {
    setIsVoiceSheetOpen(true);
  };

  const handleVoiceResult = (transcribedText: string) => {
    setSearchValue(transcribedText);
    setIsVoiceSheetOpen(false);
  };

  return (
    <>
      <div className="relative w-full max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Where do you want to go?"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-10 pr-12 h-12 text-base"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMicClick}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-10 w-10 hover:bg-muted mobile-tap"
          >
            <Mic className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <VoiceInputSheet
        isOpen={isVoiceSheetOpen}
        onClose={() => setIsVoiceSheetOpen(false)}
        onResult={handleVoiceResult}
      />
    </>
  );
}
