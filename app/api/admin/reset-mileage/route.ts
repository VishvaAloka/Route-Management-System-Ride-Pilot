// app/api/admin/reset-mileage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ensureNewMonthInitialized } from '@/lib/mileage';

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

    const result = await ensureNewMonthInitialized();

    return NextResponse.json({
      success: true,
      message: 'Monthly mileage check completed',
      data: result
    });
  } catch (error) {
    console.error('Manual reset error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}