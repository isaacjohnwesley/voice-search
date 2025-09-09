# Google Maps API Setup

To enable location search functionality, you need to set up a Google Maps API key.

## Steps:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Places API
   - Maps JavaScript API (optional, for future map features)
4. Create credentials (API Key)
5. Restrict the API key to your domain for security
6. Add the API key to your environment variables

## Environment Variables

Add the following to your `.env.local` file:

```
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

## Features Implemented

- ✅ Voice input integration with location search
- ✅ Real-time location search dropdown
- ✅ Google Places API integration
- ✅ Debounced search (300ms delay)
- ✅ Place details display (name, address, rating, price level)
- ✅ Click outside to close dropdown
- ✅ Loading states and error handling

## Usage

1. Click the microphone button to start voice search
2. Speak your destination (e.g., "Starbucks near me", "Central Park New York")
3. Click "Use this text" to populate the search input
4. See location recommendations in the dropdown
5. Click on any location to select it

The search will automatically show results as you type or after voice input.
