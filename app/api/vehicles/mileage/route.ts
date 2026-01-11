// app/api/vehicles/mileage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { getCurrentMonthMileage } from '@/lib/mileage';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    
    const decoded = verifyToken(token) as any;
    
    if (decoded.role !== 'admin' && decoded.role !== 'project_manager') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');

    if (!vehicleId) {
      return NextResponse.json({ error: 'Vehicle ID is required' }, { status: 400 });
    }

    const mileage = await getCurrentMonthMileage(vehicleId);

    if (!mileage) {
      // Return empty data for current month
      const now = new Date();
      return NextResponse.json({
        vehicleId,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        totalMileage: 0,
        rides: []
      });
    }

    return NextResponse.json(mileage);
  } catch (error) {
    console.error('Get current mileage error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}