// app/api/maps/distance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { calculateHaversineDistance } from '@/lib/distance';

export async function POST(request: NextRequest) {
  try {
    const { origin, destination } = await request.json();
    
    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
      return NextResponse.json({ error: 'Origin and destination coordinates are required' }, { status: 400 });
    }

    const distanceKm = calculateHaversineDistance(
      origin.lat, origin.lng, 
      destination.lat, destination.lng
    );
    
    // Estimate duration (assuming average speed of 40 km/h)
    const estimatedDuration = (distanceKm / 40) * 60; // in minutes

    return NextResponse.json({ 
      distanceKm,
      durationMinutes: Math.round(estimatedDuration),
      method: 'haversine'
    });
  } catch (error) {
    console.error('Distance calculation error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}