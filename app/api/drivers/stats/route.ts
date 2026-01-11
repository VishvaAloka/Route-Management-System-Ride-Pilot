// app/api/drivers/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { RideModel, DeviceModel } from '@/lib/models';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    
    const decoded = verifyToken(token) as any;
    
    if (decoded.role !== 'driver') {
      return NextResponse.json({ error: 'Unauthorized - Driver access required' }, { status: 403 });
    }

    await connectDB();

    // Get all completed rides for this driver
    const completedRides = await RideModel.find({ 
      driverId: decoded.userId,
      status: 'completed'
    });

    // Calculate total distance
    const totalDistance = completedRides.reduce((sum, ride) => sum + ride.distanceKm, 0);

    // Calculate distance by vehicle
    const vehicleDistances: { [key: string]: { distance: number; vehicle: any; rideCount: number } } = {};
    
    for (const ride of completedRides) {
      if (ride.vehicleId) {
        if (!vehicleDistances[ride.vehicleId]) {
          // Get vehicle details
          const vehicle = await DeviceModel.findOne({ terminalId: ride.vehicleId });
          vehicleDistances[ride.vehicleId] = {
            distance: 0,
            vehicle: vehicle,
            rideCount: 0
          };
        }
        vehicleDistances[ride.vehicleId].distance += ride.distanceKm;
        vehicleDistances[ride.vehicleId].rideCount += 1;
      }
    }

    // Calculate statistics by time period
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayRides = completedRides.filter(ride => 
      new Date(ride.completedAt || ride.createdAt) >= today
    );
    const weekRides = completedRides.filter(ride => 
      new Date(ride.completedAt || ride.createdAt) >= thisWeek
    );
    const monthRides = completedRides.filter(ride => 
      new Date(ride.completedAt || ride.createdAt) >= thisMonth
    );

    const stats = {
      totalDistance: totalDistance,
      totalRides: completedRides.length,
      todayDistance: todayRides.reduce((sum, ride) => sum + ride.distanceKm, 0),
      todayRides: todayRides.length,
      weekDistance: weekRides.reduce((sum, ride) => sum + ride.distanceKm, 0),
      weekRides: weekRides.length,
      monthDistance: monthRides.reduce((sum, ride) => sum + ride.distanceKm, 0),
      monthRides: monthRides.length,
      vehicleDistances: Object.entries(vehicleDistances).map(([vehicleId, data]) => ({
        vehicleId,
        ...data
      }))
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Driver stats error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}