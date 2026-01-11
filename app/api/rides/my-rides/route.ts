// app/api/rides/my-rides/route.ts
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
    
    if (decoded.role !== 'driver') {
      return NextResponse.json({ error: 'Unauthorized - Driver access required' }, { status: 403 });
    }

    await connectDB();

    // Find rides assigned to this driver
    const rides = await RideModel.find({ 
      driverId: decoded.userId,
      status: { $in: ['approved', 'assigned', 'in_progress', 'completed'] }
    }).sort({ createdAt: -1 });

    // Get vehicle and user details for each ride
    const ridesWithDetails = await Promise.all(
      rides.map(async (ride) => {
        const rideObj = ride.toObject();
        
        // Get vehicle details if assigned
        if (ride.vehicleId) {
          const vehicle = await DeviceModel.findOne({ terminalId: ride.vehicleId });
          rideObj.vehicle = vehicle;
        }
        
        // Get user details
        const user = await UserModel.findById(ride.userId);
        rideObj.user = user;
        
        return rideObj;
      })
    );

    return NextResponse.json(ridesWithDetails);
  } catch (error) {
    console.error('Fetch driver rides error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}