// app/api/maps/reverse-geocode/route.ts
import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { lat, lng } = await request.json();
    
    if (!lat || !lng) {
      return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      return NextResponse.json({ 
        address: result.formatted_address,
        place_id: result.place_id
      });
    } else {
      return NextResponse.json({ error: data.status }, { status: 400 });
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}