// app/api/maps/place-details/route.ts
import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { place_id } = await request.json();
    
    if (!place_id) {
      return NextResponse.json({ error: 'Place ID is required' }, { status: 400 });
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&key=${GOOGLE_MAPS_API_KEY}&fields=geometry,formatted_address`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.result) {
      const location = {
        lat: data.result.geometry.location.lat,
        lng: data.result.geometry.location.lng,
        address: data.result.formatted_address
      };
      return NextResponse.json({ location });
    } else {
      return NextResponse.json({ error: data.status }, { status: 400 });
    }
  } catch (error) {
    console.error('Place details error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}