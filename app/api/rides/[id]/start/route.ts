// app/api/rides/[id]/start/route.ts - COMPLETE UPDATED
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { RideModel, UserModel, DeviceModel } from '@/lib/models'; // ✅ ADD DeviceModel
import { verifyToken } from '@/lib/auth';

import { sendRideStartNotificationToAdmin } from '@/lib/email';  // ✅ ADD THIS

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    const { id } = params;
    const body = await request.json();
    const { startMileage } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Ride ID is required' }, { status: 400 });
    }
    
    if (!startMileage || isNaN(startMileage) || startMileage <= 0) {
      return NextResponse.json({ error: 'Valid start mileage is required' }, { status: 400 });
    }

    const ride = await RideModel.findById(id);
    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }
    
    if (ride.driverId !== decoded.userId) {
      return NextResponse.json({ error: 'This ride is not assigned to you' }, { status: 403 });
    }
    
    if (ride.status !== 'assigned') {
      return NextResponse.json({ 
        error: `Cannot start ride. Current status: ${ride.status}` 
      }, { status: 400 });
    }







      // ✅ Send notification to admin
    setImmediate(async () => {
      try {
        const [driver, vehicle, user] = await Promise.all([
          UserModel.findById(decoded.userId),
          DeviceModel.findOne({ terminalId: ride.vehicleId }),
          UserModel.findById(ride.userId)
        ]);

        if (driver && vehicle) {
          await sendRideStartNotificationToAdmin({
            rideId: ride._id.toString(),
            driverName: driver.name,
            driverEmail: driver.email,
            vehicleName: vehicle.vehicle,
            vehicleType: vehicle.vehicleType,
            vehicleNumber: vehicle.terminalId,
            startMileage: ride.startMileage!,
            pickupLocation: ride.startLocation.address,
            dropoffLocation: ride.endLocation.address,
            distanceKm: ride.distanceKm.toFixed(1),
            tripType: ride.tripType === 'return-trip' ? 'Return Trip' : 'One-Way',
            userName: user?.name || 'Unknown',
            userEmail: user?.email || '',
            startedAt: new Date(ride.startedAt!).toLocaleString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          });
          console.log('✅ Ride start notification sent to admin');
        }
      } catch (emailError) {
        console.error('⚠️ Email notification error:', emailError);
      }
    });
    
    return NextResponse.json(ride);












    // Update ride
    ride.status = 'in_progress';
    ride.startMileage = parseFloat(startMileage);
    ride.startedAt = new Date();
    await ride.save();
    
    // ✅ Mark driver as unavailable
    await UserModel.findByIdAndUpdate(
      decoded.userId,
      { isAvailable: false }
    );
    
    // ✅ NEW: Mark vehicle as unavailable
    if (ride.vehicleId) {
      await DeviceModel.findOneAndUpdate(
        { terminalId: ride.vehicleId },
        { isAvailable: false }
      );
      console.log(`✅ Vehicle ${ride.vehicleId} marked as unavailable`);
    }
    
    console.log(`✅ Ride ${id} started - Driver & Vehicle marked unavailable - Mileage: ${startMileage} km`);
    
    return NextResponse.json(ride);
  } catch (error) {
    console.error('Start ride error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}