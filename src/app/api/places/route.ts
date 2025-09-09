import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  if (!apiKey) {
    return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
  }

  try {
    // Use Google Places API Text Search
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API error: ${data.status}`);
    }

    // Transform the results to a cleaner format
    const places = data.results?.map((place: {
      place_id: string;
      name: string;
      formatted_address: string;
      geometry?: { location: { lat: number; lng: number } };
      rating?: number;
      price_level?: number;
      types: string[];
      photos?: Array<{
        photo_reference: string;
        height: number;
        width: number;
      }>;
    }) => ({
      id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      location: place.geometry?.location,
      rating: place.rating,
      priceLevel: place.price_level,
      types: place.types,
      photos: place.photos?.map((photo: {
        photo_reference: string;
        height: number;
        width: number;
      }) => ({
        reference: photo.photo_reference,
        height: photo.height,
        width: photo.width
      }))
    })) || [];

    return NextResponse.json({ places });
  } catch (error) {
    console.error('Places API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch places' },
      { status: 500 }
    );
  }
}
