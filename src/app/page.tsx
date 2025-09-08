import { SearchInput } from "@/components/search-input";
import { MapPin } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-first design */}
      <div className="flex flex-col h-screen max-w-md mx-auto bg-background">
        {/* Header with search input */}
        <div className="flex-shrink-0 p-4 pt-8 pb-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Rapido</h1>
            <SearchInput />
          </div>
        </div>

        {/* Main content area - blank for now */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
              <MapPin className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-muted-foreground">
                Where to?
              </h2>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Enter your destination or use voice search to find your ride
              </p>
            </div>
          </div>
        </div>

        {/* Bottom spacing for mobile */}
        <div className="flex-shrink-0 h-8" />
      </div>
    </div>
  );
}
