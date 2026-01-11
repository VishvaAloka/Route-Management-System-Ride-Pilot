// app/api/rides/daily-rides/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { DailyRideModel, DeviceModel } from '@/lib/models';
import { verifyToken } from '@/lib/auth';
import { updateVehicleMileage } from '@/lib/mileage';

// GET: Fetch driver's daily rides
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

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find today's daily rides for this driver
    const dailyRides = await DailyRideModel.find({ 
      driverId: decoded.userId,
      createdAt: { $gte: today, $lt: tomorrow }
    }).sort({ createdAt: -1 });

    // Get vehicle details for each ride
    const ridesWithDetails = await Promise.all(
      dailyRides.map(async (ride) => {
        const rideObj = ride.toObject();
        
        if (ride.vehicleId) {
          const vehicle = await DeviceModel.findOne({ terminalId: ride.vehicleId });
          rideObj.vehicle = vehicle;
        }
        
        return rideObj;
      })
    );

    return NextResponse.json(ridesWithDetails);
  } catch (error) {
    console.error('GET daily rides error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: Create/Start a daily ride
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { vehicleId, destination, startMileage } = body;

    // Validation
    if (!vehicleId) {
      return NextResponse.json({ error: 'Vehicle ID is required' }, { status: 400 });
    }

    if (!destination || !['Site-Gampaha', 'Site-Kadana', 'Site-Colombo'].includes(destination)) {
      return NextResponse.json({ error: 'Valid destination is required' }, { status: 400 });
    }

    if (!startMileage || isNaN(startMileage) || startMileage <= 0) {
      return NextResponse.json({ error: 'Valid start mileage is required' }, { status: 400 });
    }

    // Check if vehicle exists and is available
    const vehicle = await DeviceModel.findOne({ terminalId: vehicleId });
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    if (!vehicle.isAvailable) {
      return NextResponse.json({ error: 'Vehicle is not available' }, { status: 400 });
    }

    // Create daily ride
    const dailyRide = new DailyRideModel({
      driverId: decoded.userId,
      vehicleId,
      destination,
      startMileage: parseFloat(startMileage),
      status: 'in_progress'
    });

    await dailyRide.save();

    // Mark vehicle as unavailable
    vehicle.isAvailable = false;
    await vehicle.save();

    console.log(`✅ Daily ride started: Driver ${decoded.userId}, Vehicle ${vehicleId}, Destination ${destination}`);

    return NextResponse.json(dailyRide);
  } catch (error) {
    console.error('POST daily ride error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH: Complete a daily ride
export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const { dailyRideId, endMileage } = body;

    if (!dailyRideId) {
      return NextResponse.json({ error: 'Daily ride ID is required' }, { status: 400 });
    }

    if (!endMileage || isNaN(endMileage) || endMileage <= 0) {
      return NextResponse.json({ error: 'Valid end mileage is required' }, { status: 400 });
    }

    const dailyRide = await DailyRideModel.findById(dailyRideId);
    if (!dailyRide) {
      return NextResponse.json({ error: 'Daily ride not found' }, { status: 404 });
    }

    if (dailyRide.driverId !== decoded.userId) {
      return NextResponse.json({ error: 'This daily ride is not assigned to you' }, { status: 403 });
    }

    if (dailyRide.status !== 'in_progress') {
      return NextResponse.json({ 
        error: `Daily ride is not in progress. Current status: ${dailyRide.status}` 
      }, { status: 400 });
    }

    if (endMileage <= dailyRide.startMileage) {
      return NextResponse.json({ 
        error: 'End mileage must be greater than start mileage' 
      }, { status: 400 });
    }

    // Calculate total mileage
    const totalMileage = parseFloat((endMileage - dailyRide.startMileage).toFixed(2));

    // Update daily ride
    dailyRide.endMileage = parseFloat(endMileage);
    dailyRide.totalMileage = totalMileage;
    dailyRide.status = 'completed';
    dailyRide.completedAt = new Date();
    await dailyRide.save();

    console.log(`✅ Daily ride completed - Start: ${dailyRide.startMileage}, End: ${endMileage}, Total: ${totalMileage} km`);

    // Update monthly vehicle mileage
    if (dailyRide.vehicleId && totalMileage > 0) {
      await updateVehicleMileage({
        vehicleId: dailyRide.vehicleId,
        mileage: totalMileage,
        dailyRideId: dailyRide._id.toString(),
        type: 'daily-ride'
      });
      console.log(`✅ Vehicle mileage updated: +${totalMileage} km (Daily Ride)`);
    }

    // Free up the vehicle
    if (dailyRide.vehicleId) {
      await DeviceModel.findOneAndUpdate(
        { terminalId: dailyRide.vehicleId },
        { isAvailable: true }
      );
      console.log(`✅ Vehicle ${dailyRide.vehicleId} marked as available`);
    }

    return NextResponse.json(dailyRide);
  } catch (error) {
    console.error('PATCH daily ride error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}