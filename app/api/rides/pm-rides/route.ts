// app/api/rides/pm-rides/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { RideModel, UserModel } from '@/lib/models';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    
    const decoded = verifyToken(token) as any;
    
    if (decoded.role !== 'project_manager') {
      return NextResponse.json({ error: 'Unauthorized - Project Manager access required' }, { status: 403 });
    }

    await connectDB();

    // Find rides that need PM approval or have been processed by PM
    const rides = await RideModel.find({ 
      $or: [
        { status: 'awaiting_pm' },
        { 'approval.projectManager': { $exists: true } }
      ]
    }).sort({ createdAt: -1 });

    // Get user details for each ride
    const ridesWithDetails = await Promise.all(
      rides.map(async (ride) => {
        const rideObj = ride.toObject();
        
        // Get user details
        const user = await UserModel.findById(ride.userId);
        rideObj.user = user;
        
        return rideObj;
      })
    );

    return NextResponse.json(ridesWithDetails);
  } catch (error) {
    console.error('Fetch PM rides error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}