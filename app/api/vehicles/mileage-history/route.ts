// app/api/vehicles/mileage-history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { getMileageHistory } from '@/lib/mileage';

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
    const limit = parseInt(searchParams.get('limit') || '12');

    if (!vehicleId) {
      return NextResponse.json({ error: 'Vehicle ID is required' }, { status: 400 });
    }

    const history = await getMileageHistory(vehicleId, limit);

    return NextResponse.json(history);
  } catch (error) {
    console.error('Get mileage history error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}