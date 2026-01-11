// app/api/rides/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { RideModel, DeviceModel } from '@/lib/models';
import { verifyToken } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    
    const decoded = verifyToken(token) as any;
    
    if (!decoded || decoded.role !== 'driver') {
      return NextResponse.json({ error: 'Unauthorized - Driver access required' }, { status: 403 });
    }

    const { status, startMileage, endMileage } = await request.json();
    
    await connectDB();

    const ride = await RideModel.findById(params.id);
    
    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }

    // Verify driver is assigned to this ride
    if (ride.driverId.toString() !== decoded.userId) {
      return NextResponse.json({ error: 'You are not assigned to this ride' }, { status: 403 });
    }

    // Validate status transitions
    if (status === 'in_progress') {
      if (ride.status !== 'assigned') {
        return NextResponse.json({ 
          error: 'Can only start a ride that is assigned' 
        }, { status: 400 });
      }
      
      if (!startMileage || startMileage <= 0) {
        return NextResponse.json({ 
          error: 'Starting mileage is required to start a ride' 
        }, { status: 400 });
      }
      
      ride.status = 'in_progress';
      ride.startMileage = startMileage;
      ride.startedAt = new Date();
      
      console.log('✅ Ride started:', {
        rideId: ride._id,
        startMileage,
        startedAt: ride.startedAt
      });
    } 
    else if (status === 'completed') {
      if (ride.status !== 'in_progress') {
        return NextResponse.json({ 
          error: 'Can only complete a ride that is in progress' 
        }, { status: 400 });
      }
      
      if (!endMileage || endMileage <= 0) {
        return NextResponse.json({ 
          error: 'Ending mileage is required to complete a ride' 
        }, { status: 400 });
      }
      
      if (ride.startMileage && endMileage <= ride.startMileage) {
        return NextResponse.json({ 
          error: 'End mileage must be greater than start mileage' 
        }, { status: 400 });
      }
      
      ride.status = 'completed';
      ride.endMileage = endMileage;
      ride.totalMileage = ride.startMileage ? (endMileage - ride.startMileage) : null;
      ride.completedAt = new Date();
      
      console.log('✅ Ride completed:', {
        rideId: ride._id,
        startMileage: ride.startMileage,
        endMileage,
        totalMileage: ride.totalMileage,
        completedAt: ride.completedAt
      });
      
      // Make vehicle available again
      if (ride.vehicleId) {
        await DeviceModel.findOneAndUpdate(
          { terminalId: ride.vehicleId },
          { isAvailable: true }
        );
        console.log('✅ Vehicle marked as available:', ride.vehicleId);
      }
    } else {
      return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 });
    }

    await ride.save();

    return NextResponse.json({ 
      message: 'Ride updated successfully',
      ride 
    });
  } catch (error) {
    console.error('❌ Update ride status error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}