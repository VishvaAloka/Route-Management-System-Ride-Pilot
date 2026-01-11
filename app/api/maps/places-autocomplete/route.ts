// app/api/maps/places-autocomplete/route.ts
import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json();
    
    if (!input) {
      return NextResponse.json({ error: 'Input is required' }, { status: 400 });
    }

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_MAPS_API_KEY}&components=country:lk&types=establishment|geocode`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK') {
      return NextResponse.json({ predictions: data.predictions });
    } else {
      return NextResponse.json({ error: data.status }, { status: 400 });
    }
  } catch (error) {
    console.error('Places autocomplete error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}