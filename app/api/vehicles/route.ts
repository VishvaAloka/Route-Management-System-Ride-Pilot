// app/api/vehicles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { DeviceModel } from '@/lib/models';
import { verifyToken } from '@/lib/auth';

// GET all vehicles
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    
    const decoded = verifyToken(token) as any;
    
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    const vehicles = await DeviceModel.find({}).sort({ createdAt: -1 });

    return NextResponse.json(vehicles);
  } catch (error) {
    console.error('GET vehicles error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Create new vehicle
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    
    const decoded = verifyToken(token) as any;
    
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { terminalId, vehicle, vehicleType } = body;

    if (!terminalId || !vehicle || !vehicleType) {
      return NextResponse.json({ 
        error: 'Terminal ID, vehicle name, and vehicle type are required' 
      }, { status: 400 });
    }

    // Check if terminal ID already exists
    const existingVehicle = await DeviceModel.findOne({ terminalId });
    if (existingVehicle) {
      return NextResponse.json({ 
        error: 'A vehicle with this Terminal ID already exists' 
      }, { status: 400 });
    }

    // Create new vehicle
    const newVehicle = new DeviceModel({
      terminalId,
      vehicle,
      vehicleType,
      status: 'offline',
      latitude: '0',
      longitude: '0',
      speed: 0,
      lastMessage: new Date().toISOString(),
      expire: new Date().toISOString(),
      isAvailable: true
    });

    await newVehicle.save();

    console.log(`✅ New vehicle created: ${vehicle} (${terminalId})`);

    return NextResponse.json(newVehicle);
  } catch (error) {
    console.error('POST vehicle error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE vehicle
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    
    const decoded = verifyToken(token) as any;
    
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('id');

    if (!vehicleId) {
      return NextResponse.json({ error: 'Vehicle ID is required' }, { status: 400 });
    }

    const vehicle = await DeviceModel.findByIdAndDelete(vehicleId);

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    console.log(`✅ Vehicle deleted: ${vehicle.vehicle}`);

    return NextResponse.json({ success: true, message: 'Vehicle deleted' });
  } catch (error) {
    console.error('DELETE vehicle error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}