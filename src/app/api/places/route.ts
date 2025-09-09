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
    const places = data.results?.map((place: any) => ({
      id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      location: place.geometry?.location,
      rating: place.rating,
      priceLevel: place.price_level,
      types: place.types,
      photos: place.photos?.map((photo: any) => ({
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
