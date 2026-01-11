// app/api/rides/live/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { RideModel, DeviceModel, UserModel } from '@/lib/models';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    
    const decoded = verifyToken(token) as any;
    
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    await connectDB();

    // Find all rides that are currently in progress
    const inProgressRides = await RideModel.find({ 
      status: 'in_progress',
      vehicleId: { $exists: true }
    });

    // Get detailed information for each ride
    const liveRides = await Promise.all(
      inProgressRides.map(async (ride) => {
        const rideObj = ride.toObject();
        
        // Get vehicle details and current location
        if (ride.vehicleId) {
          const vehicle = await DeviceModel.findOne({ terminalId: ride.vehicleId });
          if (vehicle) {
            rideObj.vehicle = vehicle;
            rideObj.currentLocation = {
              lat: parseFloat(vehicle.latitude),
              lng: parseFloat(vehicle.longitude)
            };
          }
        }
        
        // Get driver details
        if (ride.driverId) {
          const driver = await UserModel.findById(ride.driverId);
          rideObj.driver = driver;
        }
        
        // Get user details
        const user = await UserModel.findById(ride.userId);
        rideObj.user = user;
        
        return rideObj;
      })
    );

    // Filter out rides without vehicle location data
    const validLiveRides = liveRides.filter(ride => ride.currentLocation);

    return NextResponse.json(validLiveRides);
  } catch (error) {
    console.error('Live rides error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}