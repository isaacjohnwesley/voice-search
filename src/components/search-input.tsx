"use client";

import { useState } from "react";
// import { Search } from "lucide-react";
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
          <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" style={{ fontSize: '16px' }}>
            search
          </span>
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
            <span className="material-symbols-outlined text-muted-foreground" style={{ fontSize: '20px' }}>
              mic
            </span>
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
